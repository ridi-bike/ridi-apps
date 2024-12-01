import {
  getDb,
  Locations,
  type MapDataRecord,
  RidiLogger,
} from "@ridi-router/lib";
import { EnvVariables } from "./env-variables.ts";

export class RegionDownloader {
  constructor(
    private readonly locations: Locations,
    private readonly env: EnvVariables,
    private readonly db: ReturnType<typeof getDb>,
    private readonly logger: RidiLogger,
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
      await this.downloadFile(remoteKmlUrl, kmlLocation);
      await this.downloadFile(remotePbfUrl, pbfLocation);
    } catch (err) {
      this.logger.error("Region download failed", {
        region,
        error: err,
      });
      this.db.mapData.updateRecordError(mapDataRecord.id, JSON.stringify(err));
    }
  }

  private async downloadFile(url: string, dest: string): Promise<void> {
    const fileResponse = await fetch(url, { redirect: "follow" });

    if (fileResponse.body) {
      const file = await Deno.open(dest, {
        write: true,
        create: true,
      });

      await fileResponse.body.pipeTo(file.writable);
    } else {
      this.logger.error("no body in download", {
        headers: fileResponse.headers,
      });
    }
  }
}
