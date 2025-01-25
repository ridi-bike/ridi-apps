import { DenoCommand, pg, PgClient } from "@ridi-router/lib";
import type { RidiLogger } from "@ridi-router/logging/main.ts";
import PQueue from "p-queue";
import { type EnvVariables } from "./env-variables.ts";
import { type KmlProcessor } from "./kml-processor.ts";
import { type Handler } from "./handler.ts";
import { MapDataRecord } from "./types.ts";

export class DenoDirStat {
  async getDirSize(dir: string) {
    let totSize = 0;
    for await (const dirEntry of Deno.readDir(dir)) {
      const fileInfo = await Deno.lstat(`${dir}/${dirEntry.name}`);
      totSize += fileInfo.size;
    }
    return totSize;
  }
}
export class CacheGenerator {
  private queue = new PQueue({ concurrency: 1 });

  constructor(
    private readonly db: typeof pg,
    private readonly pgClient: PgClient,
    private readonly denoCommand: DenoCommand,
    private readonly logger: RidiLogger,
    private readonly env: EnvVariables,
    private readonly kml: KmlProcessor,
    private readonly handler: Handler,
    private readonly dirStat: DenoDirStat,
  ) {
  }

  public async schedule(mapDataRecord: MapDataRecord) {
    await this.queue.add(() => this.generateCache(mapDataRecord));
  }

  async generateCache(mapDataRecord: MapDataRecord) {
    this.logger.debug("Starting cache generation for record", {
      id: mapDataRecord.id,
      region: mapDataRecord.region,
    });

    await this.db.mapDataUpdateRecordProcessing(this.pgClient, {
      id: mapDataRecord.id,
    });
    const beat = setInterval(
      () =>
        this.db.mapDataUpdateRecordProcessing(this.pgClient, {
          id: mapDataRecord.id,
        }),
      60 * 1000,
    );

    const { code, stdout: stdoutOutput, stderr: stderrOutput } = await this
      .denoCommand.execute(
        this.env.routerBin,
        [
          "prep-cache",
          "--input",
          mapDataRecord.pbfLocation,
          "--cache-dir",
          mapDataRecord.cacheLocation,
        ],
      );

    this.logger.debug("Cache generation process output", {
      id: mapDataRecord.id,
      stdout: stdoutOutput,
      stderr: stderrOutput,
    });

    const cacheSize = await this.dirStat.getDirSize(
      mapDataRecord.cacheLocation,
    );

    const serverStartMoment = Date.now();
    const process = new Deno.Command(this.env.routerBin, {
      stdout: "piped",
      args: [
        "start-server",
        "--input",
        mapDataRecord.pbfLocation,
        "--cache-dir",
        mapDataRecord.cacheLocation,
        "--socket-name",
        `${Math.random()}`,
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

    process.kill();

    const serverStartTime = Math.ceil((Date.now() - serverStartMoment) / 1000);

    await this.db.mapDataUpdateRecordCacheSize(this.pgClient, {
      id: mapDataRecord.id,
      cacheSize: cacheSize.toString(),
    });
    await this.db.mapDataUpdateRecordStartupTime(this.pgClient, {
      id: mapDataRecord.id,
      startupTimeS: serverStartTime.toString(),
    });

    clearInterval(beat);

    await this.kml.processKml(mapDataRecord);

    await this.db.mapDataUpdateRecordReady(this.pgClient, {
      id: mapDataRecord.id,
    });

    if (code !== 0) {
      this.logger.error("Cache generation failed", {
        id: mapDataRecord.id,
        code,
        stderr: stderrOutput,
      });
      await this.db.mapDataUpdateRecordError(this.pgClient, {
        id: mapDataRecord.id,
        error: `stdout: ${stdoutOutput}\n\nstderr: ${stderrOutput}`,
      });
    }

    await this.handler.checkStatus();
  }

  public waitTillDone() {
    return this.queue.onIdle();
  }
}
