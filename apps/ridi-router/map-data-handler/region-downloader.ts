import {
  getDb,
  Locations,
  type MapDataRecord,
  RidiLogger,
} from "@ridi-router/lib";
import { EnvVariables } from "./env-variables.ts";

class ProgressTrack extends TransformStream {
  constructor(private readonly logChunkSize: (chunkSize: number) => void) {
    super({
      transform: (chunk, controller) => {
        this.logChunkSize(chunk.length);
        controller.enqueue(chunk);
      },
    });
  }
}

export class FileDownloader {
  constructor(
    private readonly logger: RidiLogger,
  ) {}

  async downloadFile(
    url: string,
    dest: string,
    logTotalSize?: (size: number) => void,
    logChunkSize?: (chunkSize: number) => void,
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
        fileResponse.body.pipeThrough(
          new ProgressTrack((chunkSize) =>
            logChunkSize && logChunkSize(chunkSize)
          ),
        );
      }

      await fileResponse.body.pipeTo(file.writable);
    } else {
      this.logger.error("no body in download", {
        headers: fileResponse.headers,
      });
    }
  }
}

export class RegionDownloader {
  constructor(
    private readonly locations: Locations,
    private readonly env: EnvVariables,
    private readonly db: ReturnType<typeof getDb>,
    private readonly logger: RidiLogger,
    private readonly fileDownloader: FileDownloader,
  ) {
  }

  async downloadRegion(
    region: string,
    md5: string,
    nextMapDataRecord: MapDataRecord | null,
  ): Promise<void> {
    this.logger.debug("Starting region download", { region, md5 });

    const remotePbfUrl =
      `https://download.geofabrik.de/${region}-latest.osm.pbf`;
    const remoteKmlUrl = `https://download.geofabrik.de/${region}.kml`;

    const pbfLocation = await this.locations.getPbfFileLoc(region, md5);
    const kmlLocation = await this.locations.getKmlLocation(region, md5);
    const mapDataRecord = nextMapDataRecord || this.db.mapData.createNextRecord(
      region,
      md5,
      pbfLocation,
      this.env.routerVersion,
      await this.locations.getCacheDirLoc(region, this.env.routerVersion, md5),
      kmlLocation,
    );

    this.logger.debug("Downloading PBF file", {
      region,
      remotePbfUrl,
      pbfLocation,
      kmlLocation,
    });

    try {
      await this.fileDownloader.downloadFile(remoteKmlUrl, kmlLocation);
      await this.fileDownloader.downloadFile(
        remotePbfUrl,
        pbfLocation,
        (size) => this.db.mapData.updateRecordSize(mapDataRecord.id, size),
        (chunkSize) =>
          this.db.mapData.updateRecordDownloadedSize(
            mapDataRecord.id,
            chunkSize,
          ),
      );
    } catch (err) {
      this.logger.error("Region download failed", {
        region,
        error: err,
      });
      this.db.mapData.updateRecordError(mapDataRecord.id, JSON.stringify(err));
    }
  }
}
