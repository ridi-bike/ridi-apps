import jsonnd, { NdJson } from "json-nd";
import { pg, PgClient } from "../packages/lib/main.ts";
import { RidiLogger } from "@ridi-router/logging/main.ts";
import { EnvVariables } from "./env-variables.ts";

type RegionReq = {
  reqId: string;
  createdAt: number;
};

export class RouterServerManager {
  private regionsRunning: Record<string, Deno.ChildProcess> = {};
  private regionsStarting: Set<string> = new Set();
  private currentFreeMemoryMb: number;
  private regionRequestsRunning: Record<string, RegionReq[]> = {};
  private regionRequestsWaiting: Record<string, RegionReq[]> = {};

  constructor(
    private readonly env: EnvVariables,
    private readonly db: typeof pg,
    private readonly pgClient: PgClient,
    private readonly logger: RidiLogger,
  ) {
    this.currentFreeMemoryMb = env.serverAvailMemoryMb;

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

  private async manageRouterServers() {
    const neededRegion: string | undefined = Object.entries(
      this.regionRequestsWaiting,
    )
      .filter((w) => !!w[1].length)
      .sort((r1, r2) => r1[1].at(-1)!.createdAt - r2[1].at(-1)!.createdAt)
      .map((w) => w[0])
      .filter((r) => !this.regionsStarting.has(r))[0];

    if (!neededRegion) {
      return;
    }

    const neededRegionData = await this.db.mapDataGetRecordCurrent(
      this.pgClient,
      { region: neededRegion },
    );
    if (!neededRegionData) {
      throw new Error("missing region data");
    }
    const neededMemory = Math.ceil(
      (Number(neededRegionData.cacheSize || 0) * 2) / 1024 / 1024,
    );

    while (neededMemory > this.currentFreeMemoryMb) {
      const canStopRegions = Object.entries(this.regionsRunning)
        .filter(
          (r) =>
            !this.regionRequestsRunning[r[0]]?.length &&
            !this.regionRequestsWaiting[r[0]]?.length,
        )
        .map((r) => ({
          region: r[0],
          regionMemory: Math.ceil(
            Number(neededRegionData.cacheSize || 0) / 1024 / 1024,
          ),
        }))
        .sort((r1, r2) => r1.regionMemory - r2.regionMemory);

      const regionToStop = canStopRegions[0];
      if (!regionToStop) {
        break;
      }

      await this.stopRegion(regionToStop.region);
    }

    if (neededMemory <= this.currentFreeMemoryMb) {
      await this.startRegion(neededRegion).catch((error) =>
        this.logger.error("Unable to start region", {
          error,
        }),
      );
    } else {
      this.logger.info("All routers busy, can't stop and free memory", {
        reqWaiting: this.regionRequestsWaiting,
        reqRunning: this.regionRequestsRunning,
        regionsRunning: this.regionsRunning,
      });
    }
  }

  registerRegionReq(region: string, reqId: string) {
    if (!this.regionRequestsWaiting[region]) {
      this.regionRequestsWaiting[region] = [];
    }

    if (
      !this.regionRequestsWaiting[region].find((req) => req.reqId === reqId)
    ) {
      this.regionRequestsWaiting[region].push({
        reqId,
        createdAt: Date.now(),
      });
    }
  }

  startRegionReq(region: string, reqId: string): void {
    if (!this.regionRequestsRunning[region]) {
      this.regionRequestsRunning[region] = [];
    }
    const waitingReq = this.regionRequestsWaiting[region]?.find(
      (req) => req.reqId === reqId,
    );
    if (
      !this.regionRequestsRunning[region].find((req) => req.reqId === reqId)
    ) {
      this.regionRequestsRunning[region].push({
        reqId,
        createdAt: waitingReq?.createdAt || Date.now(),
      });
    }
    if (waitingReq) {
      this.regionRequestsWaiting[region] = this.regionRequestsWaiting[
        region
      ].filter((req) => req.reqId !== waitingReq.reqId);
    }
  }

  finishRegionReq(region: string, reqId: string): void {
    if (!this.regionRequestsRunning[region]) {
      this.logger.error("Running Region set missing, unrecoverable", {
        regionRequests: this.regionRequestsRunning,
      });
      throw new Error("Unrecoverable");
    }
    this.regionRequestsRunning[region] = this.regionRequestsRunning[
      region
    ].filter((req) => req.reqId !== reqId);
  }

  async startRegion(region: string) {
    if (this.regionsRunning[region]) {
      this.logger.error(`region "{region}" already running`, { region });
      return;
    }

    const mapData = await this.db.mapDataGetRecordCurrent(this.pgClient, {
      region,
    });

    if (!mapData) {
      this.logger.error(
        `missing prepared 'current' record for region "{region}"`,
        { region },
      );
      return;
    }

    this.regionsStarting.add(region);

    const cacheSizeMb = Number(mapData.cacheSize || 0) / 1024 / 1024;

    this.currentFreeMemoryMb -= cacheSizeMb + cacheSizeMb; // double the size for startup as it needs to read and parse the cache to load in memory

    const process = new Deno.Command(this.env.routerBin, {
      stdout: "piped",
      stderr: "piped",
      stdin: "piped",
      args: [
        "start-server",
        "--input",
        mapData.pbfLocation,
        "--cache-dir",
        mapData.cacheLocation,
        "--socket-name",
        region,
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

    process.stdout.pipeTo(writableStream);
    process.stderr.pipeTo(
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

    this.currentFreeMemoryMb += cacheSizeMb; // when server started, leave only running memory
    this.regionsRunning[region] = process;
    this.regionsStarting.delete(region);
  }

  async stopRegion(region: string) {
    const neededRegionData = await this.db.mapDataGetRecordCurrent(
      this.pgClient,
      { region },
    );
    const process = this.regionsRunning[region];
    if (!process) {
      this.logger.error(`region "{region}" is not running`, { region });
      return;
    }
    process.kill();

    delete this.regionsRunning[region];
    this.currentFreeMemoryMb += Math.ceil(
      Number(neededRegionData?.cacheSize || 0) / 1024 / 1024,
    );
  }

  isRegionRunning(region: string) {
    return !!this.regionsRunning[region];
  }
}
