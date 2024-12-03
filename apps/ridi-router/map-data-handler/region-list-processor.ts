import { getDb, MapDataRecord, pg, RidiLogger } from "@ridi-router/lib";

import { PgClient } from "./pg-client.ts";
import { Cleaner } from "./cleaner.ts";
import { EnvVariables } from "./env-variables.ts";
import { CacheGenerator } from "./cache-generator.ts";
import { Handler } from "./handler.ts";
import { RegionDownloader } from "./region-downloader.ts";
import { OsmLocations } from "./osm-locations.ts";

export class Md5Downloader {
  constructor(
    private readonly logger: RidiLogger,
    private readonly osmLocations: OsmLocations,
  ) {
  }

  async getRemoteMd5(region: string) {
    const remoteMd5Url = this.osmLocations.getMd5FileLocRemote(region);

    this.logger.debug("Fetching MD5 for region", { region, remoteMd5Url });

    const remoteMd5File = await fetch(remoteMd5Url, { redirect: "follow" });
    const body = await remoteMd5File.text();
    const remoteMd5 = body.split(" ")[0];

    this.logger.debug("Remote MD5", { remoteMd5 });

    return remoteMd5;
  }
}
export class RegionListProcessor {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly logger: RidiLogger,
    private readonly env: EnvVariables,
    private readonly cacheGenerator: CacheGenerator,
    private readonly handler: Handler,
    private readonly cleaner: Cleaner,
    private readonly downloader: RegionDownloader,
    private readonly pgQueries: typeof pg,
    private readonly pgClient: PgClient,
    private readonly mdfDownloader: Md5Downloader,
  ) {
  }
  private async handleNextRecord(
    region: string,
    remoteMd5: string,
    nextMapData: MapDataRecord,
  ) {
    if (
      remoteMd5 !== nextMapData.pbf_md5 || nextMapData.status === "error" ||
      nextMapData.router_version !== this.env.routerVersion
    ) {
      this.logger.debug("discarding and downloading region", {
        remoteMd5,
        routerVersion: this.env.routerVersion,
      });
      this.db.mapData.updateRecordDiscarded(nextMapData.id);
      await this.pgQueries.regionSetDiscarded(this.pgClient, {
        region: nextMapData.region,
        pbfMd5: nextMapData.pbf_md5,
      });
      await this.downloader.downloadRegion(region, remoteMd5, null);
    } else if (nextMapData.status === "new") {
      this.logger.debug("Status new, downloading region");
      await this.downloader.downloadRegion(region, remoteMd5, nextMapData);
    } else if (
      nextMapData.status === "downloaded" ||
      nextMapData.status === "processing"
    ) {
      this.logger.debug("Status {status}, processing", {
        status: nextMapData.status,
      });
      await this.cacheGenerator.schedule(nextMapData);
    }
  }

  private async handleCurrentRecord(
    region: string,
    remoteMd5: string,
    currentMapData: MapDataRecord | null,
  ) {
    this.logger.debug("Current Map Data Record", { ...currentMapData });
    if (currentMapData) {
      if (
        remoteMd5 !== currentMapData.pbf_md5 ||
        currentMapData.router_version !== this.env.routerVersion
      ) {
        this.logger.debug("MD5 differs, downloading");
        await this.downloader.downloadRegion(region, remoteMd5, null);
      }
    } else {
      this.logger.debug("no current record, downloading");
      await this.downloader.downloadRegion(region, remoteMd5, null);
    }
  }
  async process() {
    this.logger.debug("Starting region list processing");

    this.db.handlers.updateRecordProcessing("map-data");

    for (const region of this.env.regions) {
      this.logger.debug("Processing region", { region });

      const remoteMd5 = await this.mdfDownloader.getRemoteMd5(region);

      const nextMapData = this.db.mapData.getRecordNext(region);

      this.logger.debug("Next Map Data Record", { ...nextMapData });

      if (nextMapData) {
        await this.handleNextRecord(region, remoteMd5, nextMapData);
      } else {
        const currentMapData = this.db.mapData.getRecordCurrent(region);
        await this.handleCurrentRecord(region, remoteMd5, currentMapData);
      }
    }

    this.logger.debug("All regions checked");

    await this.cacheGenerator.waitTillDone();

    await this.cleaner.processCleanup();

    this.handler.checkStatus();
  }
}
