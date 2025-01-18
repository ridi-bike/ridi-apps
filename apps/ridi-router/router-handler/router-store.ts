import { EnvVariables } from "./env-variables.ts";
import { getDb, RidiLogger } from "@ridi-router/lib";

export class RouterStore {
  private routers: Record<string, Deno.ChildProcess> = {};
  constructor(
    private readonly env: EnvVariables,
    private readonly db: ReturnType<typeof getDb>,
    private readonly logger: RidiLogger,
  ) {
  }

  async startRegion(region: string) {
    if (this.routers[region]) {
      this.logger.error(
        `region "{region}" already running`,
        { region },
      );
      return;
    }

    const regionData = this.db.mapData.getRecordCurrent(region);

    if (!regionData) {
      this.logger.error(
        `missing prepared 'current' record for region "{region}"`,
        { region },
      );
      return;
    }

    const process = new Deno.Command(this.env.routerBin, {
      stderr: "piped",
      args: [
        "server",
        "--input",
        regionData.pbf_location,
        "--cache-dir",
        regionData.cache_location,
        "--socket-name",
        region,
      ],
    }).spawn();

    this.routers[region] = process;

    await new Promise<void>((resolve) => {
      process.stderr.pipeTo(
        new WritableStream({
          write: (chunk, controller) => {
            const text = new TextDecoder().decode(chunk);
            if (
              text.split(";").find((t) => t === "RIDI_ROUTER SERVER READY")
            ) {
              console.log("found READY");
              resolve();
            }
          },
        }),
      );
    });
  }

  stopRegion(region: string) {
    const process = this.routers[region];
    if (!process) {
      this.logger.error(
        `region "{region}" is not running`,
        { region },
      );
      return;
    }
    process.kill();
  }

  isRegionRunning(region: string) {
    return !!this.routers[region];
  }
}
