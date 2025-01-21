import { EnvVariables } from "./env-variables.ts";
import { getDb } from "@ridi-router/lib";
import { handleMaybeErrors, RidiLogger } from "@ridi-router/logging/main.ts";

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
  private regions: ReturnType<
    ReturnType<typeof getDb>["mapData"]["getRecordsAllCurrent"]
  >;
  constructor(
    private readonly env: EnvVariables,
    private readonly db: ReturnType<typeof getDb>,
    private readonly logger: RidiLogger,
  ) {
    this.currentFreeMemoryMb = env.serverAvailMemoryMb;
    this.regions = db.mapData.getRecordsAllCurrent();

    setInterval(() =>
      this.manageRouterServers().catch((error) => {
        logger.error(
          "Error while running Router Server Management, unrecoverable",
          { error: handleMaybeErrors(error) },
        );
      }), 500);
  }

  private async manageRouterServers() {
    const neededRegion: string | undefined = Object
      .entries(this.regionRequestsWaiting)
      .filter((w) => !!w[1].length)
      .sort((r1, r2) => r1[1].at(-1)!.createdAt - r2[1].at(-1)!.createdAt)
      .map((w) => w[0])
      .filter((r) => !this.regionsStarting.has(r))[0];

    if (!neededRegion) {
      return;
    }

    const neededRegionData = this.regions.find((r) =>
      r.region === neededRegion
    );
    if (!neededRegionData) {
      throw new Error("missing region data");
    }
    const neededMemory = Math.ceil(
      (neededRegionData.cache_size || 0) * 2 / 1024 / 1024,
    );

    while (neededMemory > this.currentFreeMemoryMb) {
      const canStopRegions = Object
        .entries(this.regionsRunning)
        .filter((r) =>
          !this.regionRequestsRunning[r[0]]?.length &&
          !this.regionRequestsWaiting[r[0]]?.length
        ).map((r) => ({
          region: r[0],
          regionMemory: Math.ceil(
            (this.regions.find((rd) => rd.region === r[0])!.cache_size || 0) /
              1024 / 1024,
          ),
        })).sort((r1, r2) => r1.regionMemory - r2.regionMemory);

      const regionToStop = canStopRegions[0];
      if (!regionToStop) {
        break;
      }

      this.stopRegion(regionToStop.region);
    }

    if (neededMemory <= this.currentFreeMemoryMb) {
      await this.startRegion(neededRegion).catch((error) =>
        this.logger.error("Unable to start region", {
          error: handleMaybeErrors(error),
        })
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
    const waitingReq = this.regionRequestsWaiting[region]?.find((req) =>
      req.reqId === reqId
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
      this.regionRequestsWaiting[region] = this.regionRequestsWaiting[region]
        .filter(
          (req) => req.reqId !== waitingReq.reqId,
        );
    }
  }

  finishRegionReq(region: string, reqId: string): void {
    if (!this.regionRequestsRunning[region]) {
      this.logger.error("Running Region set missing, unrecoverable", {
        regionRequests: this.regionRequestsRunning,
      });
      throw new Error("Unrecoverable");
    }
    this.regionRequestsRunning[region] = this.regionRequestsRunning[region]
      .filter((req) => req.reqId !== reqId);
  }

  async startRegion(region: string) {
    if (this.regionsRunning[region]) {
      this.logger.error(
        `region "{region}" already running`,
        { region },
      );
      return;
    }

    const mapData = this.db.mapData.getRecordCurrent(region);

    if (!mapData) {
      this.logger.error(
        `missing prepared 'current' record for region "{region}"`,
        { region },
      );
      return;
    }

    this.regionsStarting.add(region);

    const cacheSizeMb = (mapData.cache_size || 0) / 1024 / 1024;

    this.currentFreeMemoryMb -= cacheSizeMb + cacheSizeMb; // double the size for startup as it needs to read and parse the cache to load in memory

    const process = new Deno.Command(this.env.routerBin, {
      stdout: "piped",
      args: [
        "start-server",
        "--input",
        mapData.pbf_location,
        "--cache-dir",
        mapData.cache_location,
        "--socket-name",
        region,
      ],
    }).spawn();

    await new Promise<void>((resolve) => {
      const writableStream = new WritableStream({
        write: (chunk, _controller) => {
          const text = new TextDecoder().decode(chunk);
          if (
            text.split(";").find((t) => t === "RIDI_ROUTER SERVER READY")
          ) {
            resolve();
          }
        },
      });
      process.stdout.pipeTo(
        writableStream,
      );
    });

    this.currentFreeMemoryMb += cacheSizeMb; // when server started, leave only running memory
    this.regionsRunning[region] = process;
    this.regionsStarting.delete(region);
  }

  stopRegion(region: string) {
    const process = this.regionsRunning[region];
    if (!process) {
      this.logger.error(
        `region "{region}" is not running`,
        { region },
      );
      return;
    }
    process.kill();

    delete this.regionsRunning[region];
    this.currentFreeMemoryMb += Math.ceil(
      (this.regions.find((r) => r.region === region)!.cache_size || 0) / 1024 /
        1024,
    );
  }

  isRegionRunning(region: string) {
    return !!this.regionsRunning[region];
  }
}
