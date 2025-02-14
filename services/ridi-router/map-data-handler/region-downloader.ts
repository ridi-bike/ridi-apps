import { pg, PgClient } from "@ridi-router/lib";
import type { RidiLogger } from "@ridi-router/logging/main.ts";
import { CacheGenerator } from "./cache-generator.ts";
import { OsmLocations } from "./osm-locations.ts";
import { MapDataRecord } from "./types.ts";

class ProgressTrack extends TransformStream {
  constructor(logChunkSize: (chunkSize: number) => void) {
    super({
      transform: (chunk, controller) => {
        logChunkSize(chunk.length);
        controller.enqueue(chunk);
      },
    });
  }
}

export class FileDownloader {
  constructor(private readonly logger: RidiLogger) {}

  async downloadFile(
    url: string,
    dest: string,
    logTotalSize?: (size: number) => Promise<void>,
    logChunkSize?: (chunkSize: number) => Promise<void>,
  ): Promise<void> {
    const fileResponse = await fetch(url, { redirect: "follow" });

    if (fileResponse.body) {
      if (logTotalSize) {
        const size = fileResponse.headers.get("Content-Length");
        if (size && Number(size).toString() === size) {
          logTotalSize(Number(size));
        }
      }
      const file = await Deno.open(dest, {
        write: true,
        create: true,
      });

      if (logChunkSize) {
        await fileResponse.body
          .pipeThrough(
            new ProgressTrack(
              (chunkSize) => logChunkSize && logChunkSize(chunkSize),
            ),
          )
          .pipeTo(file.writable);
      } else {
        await fileResponse.body.pipeTo(file.writable);
      }
    } else {
      this.logger.error("no body in download", {
        headers: fileResponse.headers,
      });
    }
  }
}

export class RegionDownloader {
  constructor(
    private readonly db: typeof pg,
    private readonly pgClient: PgClient,
    private readonly logger: RidiLogger,
    private readonly fileDownloader: FileDownloader,
    private readonly cacheGenerator: CacheGenerator,
    private readonly osmLocations: OsmLocations,
  ) {}

  async downloadRegion(
    region: string,
    md5: string,
    mapDataRecord: MapDataRecord,
  ): Promise<void> {
    this.logger.debug("Starting region download", { region, md5 });

    const remotePbfUrl = this.osmLocations.getPbfFileLocRemote(region);
    const remoteKmlUrl = this.osmLocations.getKmlFileLocRemote(region);

    this.logger.debug("Downloading PBF file", {
      region,
      remotePbfUrl,
      pbfLocation: mapDataRecord.pbfLocation,
      kmlLocation: mapDataRecord.kmlLocation,
    });

    try {
      await this.fileDownloader.downloadFile(
        remoteKmlUrl,
        mapDataRecord.kmlLocation,
      );
      await this.fileDownloader.downloadFile(
        remotePbfUrl,
        mapDataRecord.pbfLocation,
        (size) =>
          this.db.mapDataUpdateRecordPbfSize(this.pgClient, {
            id: mapDataRecord.id,
            pbfSize: size.toString(),
          }),
        (chunkSize) =>
          this.db.mapDataUpdateRecordPbfDownloadedSize(this.pgClient, {
            id: mapDataRecord.id,
            pbfDownloadedSize: chunkSize.toString(),
          }),
      );
      await this.cacheGenerator.schedule(mapDataRecord);
    } catch (err) {
      this.logger.error("Region download failed", {
        region,
        error: String(err),
      });
      await this.db.mapDataUpdateRecordError(this.pgClient, {
        id: mapDataRecord.id,
        error: JSON.stringify(err),
      });
      throw new Error("unrecoverable");
    }
  }
}
