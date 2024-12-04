import { getDb, type MapDataRecord, type RidiLogger } from "@ridi-router/lib";
import PQueue from "p-queue";
import { type EnvVariables } from "./env-variables.ts";
import { type KmlProcessor } from "./kml-processor.ts";
import { type Handler } from "./handler.ts";

export class DenoCommand {
  async execute(command: string, args: string[]) {
    const cmd = new Deno.Command(command, { args });
    const { code, stdout, stderr } = await cmd.output();

    return {
      code,
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
    };
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
          "cache",
          "-i",
          mapDataRecord.pbf_location,
          "-c",
          mapDataRecord.cache_location,
        ],
      );

    clearInterval(beat);

    this.logger.debug("Cache generation process output", {
      id: mapDataRecord.id,
      stdout: stdoutOutput,
      stderr: stderrOutput,
    });

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
