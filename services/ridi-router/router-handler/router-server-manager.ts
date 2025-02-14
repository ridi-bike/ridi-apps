import { NdJson } from "json-nd";
import { RidiLogger } from "@ridi-router/logging/main.ts";
import { EnvVariables } from "./env-variables.ts";
import { MapDataGetRecordCurrentRow } from "../packages/lib/queries_sql.ts";

class RidiRouterServerProcess {
  private readonly logger: RidiLogger;
  private readonly env: EnvVariables;

  private state: "not-running" | "starting" | "running" = "not-running";
  private readonly memoryReqRunningMb: number;
  private process: Deno.ChildProcess | null = null;
  private readonly mapDataRecord: MapDataGetRecordCurrentRow;
  private readonly requestsWaiting = new Set<string>();
  private readonly requestsRunning = new Set<string>();
  private readonly requestsQueue: { refId: string; createdAt: Date }[] = [];

  constructor(
    mapDataRecord: MapDataGetRecordCurrentRow,
    logger: RidiLogger,
    env: EnvVariables,
  ) {
    this.logger = logger;
    this.env = env;

    this.mapDataRecord = mapDataRecord;
    this.memoryReqRunningMb =
      Number(this.mapDataRecord.cacheSize || 0) / 1024 / 1024;
  }

  addRequest(refId: string) {
    this.requestsWaiting.add(refId);
    this.requestsQueue.push({ refId, createdAt: new Date() });
  }

  processRequest(refId: string) {
    this.requestsWaiting.delete(refId);
    this.requestsRunning.add(refId);
    const idx = this.requestsQueue.findIndex((p) => p.refId === refId);
    if (idx === -1) {
      this.requestsQueue.push({ refId, createdAt: new Date() });
    }
  }

  finishRequest(refId: string) {
    this.requestsRunning.delete(refId);
    const idx = this.requestsQueue.findIndex((p) => p.refId === refId);
    if (idx !== -1) {
      this.requestsQueue.splice(idx, 1);
    }
  }

  canBeStopped() {
    return (
      this.state === "running" &&
      !this.requestsWaiting.size &&
      !this.requestsRunning.size
    );
  }

  mustBeStarted() {
    return this.state === "not-running" && !!this.requestsWaiting.size;
  }

  maxQueueWaitTime() {
    const firstReq = this.requestsQueue[0];
    if (!firstReq) {
      return 0;
    }
    return Date.now() - firstReq.createdAt.getTime();
  }

  getMemoryCurr() {
    if (this.state === "not-running") {
      return 0;
    }
    if (this.state === "starting") {
      return this.getMemoryStartup();
    }
    return this.memoryReqRunningMb;
  }

  getMemoryStartup() {
    return this.memoryReqRunningMb * 2;
  }

  getRegionId() {
    return this.mapDataRecord.region;
  }

  isRunning() {
    return this.state === "running";
  }

  async start() {
    this.state = "starting";
    this.logger.info("Starting server");

    this.process = new Deno.Command(this.env.routerBin, {
      stdout: "piped",
      stderr: "piped",
      stdin: "piped",
      args: [
        "start-server",
        "--input",
        this.mapDataRecord.pbfLocation,
        "--cache-dir",
        this.mapDataRecord.cacheLocation,
        "--socket-name",
        this.mapDataRecord.region,
      ],
    }).spawn();

    let resolve: (_: void | PromiseLike<void>) => void = () => undefined;
    const readinessPromise = new Promise<void>((resolveInner) => {
      resolve = resolveInner;
    });
    const writableStream = new WritableStream({
      write: (chunk, _controller) => {
        const text = new TextDecoder().decode(chunk);
        if (text.split(";").find((t) => t === "RIDI_ROUTER SERVER READY")) {
          resolve();
        }
      },
    });

    this.process.stdout.pipeTo(writableStream);
    this.process.stderr.pipeTo(
      new WritableStream({
        write: (chunk) => {
          const decoded = new TextDecoder().decode(chunk);
          try {
            const parsed = NdJson.parse(decoded);
            this.logger.info("ridi-router-server output", {
              output: parsed,
            });
          } catch (err) {
            this.logger.error("ridi-router-server unparsable output", {
              decoded,
              err,
            });
          }
        },
      }),
    );

    await readinessPromise;

    this.logger.info("Startup finished");

    this.state = "running";
  }

  stop() {
    this.logger.info("Stopping region");
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    if (this.requestsRunning.size) {
      for (const refId of this.requestsRunning.values()) {
        this.requestsWaiting.add(refId);
      }
      this.requestsRunning.clear();
    }
    this.state = "not-running";
  }
}

export class RouterServerManager {
  private readonly env: EnvVariables;
  private readonly logger: RidiLogger;
  private readonly serverProcesses: Record<string, RidiRouterServerProcess>;

  private managerRunning = false;
  constructor(
    env: EnvVariables,
    logger: RidiLogger,
    mapDataRecordsAllCurrent: MapDataGetRecordCurrentRow[],
  ) {
    this.env = env;
    this.logger = logger;

    this.serverProcesses = this.env.regions.reduce(
      (processes, region) => {
        const mapDataRecord = mapDataRecordsAllCurrent.find(
          (rec) => rec.region === region,
        )!;
        processes[region] = new RidiRouterServerProcess(
          mapDataRecord,
          this.logger.withCOntext({
            module: "ridi-router-server-process",
            region: mapDataRecord.region,
          }),
          this.env,
        );
        return processes;
      },
      {} as Record<string, RidiRouterServerProcess>,
    );

    setInterval(
      () =>
        this.manageRouterServers().catch((error) => {
          logger.error(
            "Error while running Router Server Management, unrecoverable",
            { error },
          );
        }),
      500,
    );
  }

  private isEnoughMemoryFor(serverProcess: RidiRouterServerProcess) {
    const currentMemoryMb = Object.values(this.serverProcesses).reduce(
      (mem, proc) => mem + proc.getMemoryCurr(),
      0,
    );
    const availMemoryMb = this.env.serverAvailMemoryMb - currentMemoryMb;
    return availMemoryMb > serverProcess.getMemoryStartup();
  }

  private async manageRouterServers() {
    if (this.managerRunning) {
      return;
    }

    this.managerRunning = true;

    const neededRegions = Object.values(this.serverProcesses)
      .filter((region) => region.mustBeStarted())
      .sort((a, b) => b.maxQueueWaitTime() - a.maxQueueWaitTime());

    if (!neededRegions.length) {
      this.managerRunning = false;
      return;
    }

    this.logger.info("Need to start regions");

    for (const neededRegion of neededRegions) {
      if (this.isEnoughMemoryFor(neededRegion)) {
        await neededRegion.start();
      } else {
        const canBeStoppedRegions = Object.values(this.serverProcesses)
          .filter((proc) => proc.canBeStopped())
          .sort((a, b) => a.getMemoryCurr() - b.getMemoryCurr());

        for (const canBestoppedRegion of canBeStoppedRegions) {
          canBestoppedRegion.stop();
          if (this.isEnoughMemoryFor(neededRegion)) {
            await neededRegion.start();
            break;
          }
        }
      }
    }

    this.managerRunning = false;
  }

  forceStopRegion(region: string) {
    this.serverProcesses[region].stop();
  }

  registerRegionReq(region: string, reqId: string): void {
    this.serverProcesses[region].addRequest(reqId);
  }

  startRegionReq(region: string, reqId: string): void {
    this.serverProcesses[region].processRequest(reqId);
  }

  finishRegionReq(region: string, reqId: string): void {
    this.serverProcesses[region].finishRequest(reqId);
  }

  isRegionRunning(region: string) {
    return !!this.serverProcesses[region].isRunning();
  }
}
