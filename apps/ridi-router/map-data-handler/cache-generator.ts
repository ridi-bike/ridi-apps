import { DenoCommand, getDb, type MapDataRecord } from "@ridi-router/lib";
import type { RidiLogger } from "@ridi-router/logging/main.ts";
import PQueue from "p-queue";
import { type EnvVariables } from "./env-variables.ts";
import { type KmlProcessor } from "./kml-processor.ts";
import { type Handler } from "./handler.ts";

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
    private readonly db: ReturnType<typeof getDb>,
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

    this.db.mapData.updateRecordProcessing(mapDataRecord.id);
    const beat = setInterval(
      () => this.db.mapData.updateRecordProcessing(mapDataRecord.id),
      60 * 1000,
    );

    const { code, stdout: stdoutOutput, stderr: stderrOutput } = await this
      .denoCommand.execute(
        this.env.routerBin,
        [
          "prep-cache",
          "--input",
          mapDataRecord.pbf_location,
          "--cache-dir",
          mapDataRecord.cache_location,
        ],
      );

    this.logger.debug("Cache generation process output", {
      id: mapDataRecord.id,
      stdout: stdoutOutput,
      stderr: stderrOutput,
    });

    const cacheSize = await this.dirStat.getDirSize(
      mapDataRecord.cache_location,
    );

    const serverStartMoment = Date.now();
    const process = new Deno.Command(this.env.routerBin, {
      stdout: "piped",
      args: [
        "start-server",
        "--input",
        mapDataRecord.pbf_location,
        "--cache-dir",
        mapDataRecord.cache_location,
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

    this.db.mapData.updateRecordCacheSize(mapDataRecord.id, cacheSize);
    this.db.mapData.updateRecordStartupTime(
      mapDataRecord.id,
      serverStartTime,
    );

    clearInterval(beat);

    await this.kml.processKml(mapDataRecord);

    this.db.mapData.updateRecordReady(mapDataRecord.id);
    if (code !== 0) {
      this.logger.error("Cache generation failed", {
        id: mapDataRecord.id,
        code,
        stderr: stderrOutput,
      });
      this.db.mapData.updateRecordError(
        mapDataRecord.id,
        `stdout: ${stdoutOutput}\n\nstderr: ${stderrOutput}`,
      );
    }

    this.handler.checkStatus();
  }

  public waitTillDone() {
    return this.queue.onIdle();
  }
}
