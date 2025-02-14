import { Locations, pg, PgClient } from "@ridi-router/lib";

import type { RidiLogger } from "@ridi-router/logging/main.ts";
import { type Cleaner } from "./cleaner.ts";
import { type EnvVariables } from "./env-variables.ts";
import { type CacheGenerator } from "./cache-generator.ts";
import { type Handler } from "./handler.ts";
import { type RegionDownloader } from "./region-downloader.ts";
import { type OsmLocations } from "./osm-locations.ts";
import { MapDataRecord } from "./types.ts";

export class Md5Downloader {
  constructor(
    private readonly logger: RidiLogger,
    private readonly osmLocations: OsmLocations,
  ) {}

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
    private readonly logger: RidiLogger,
    private readonly env: EnvVariables,
    private readonly cacheGenerator: CacheGenerator,
    private readonly handler: Handler,
    private readonly cleaner: Cleaner,
    private readonly downloader: RegionDownloader,
    private readonly pgQueries: typeof pg,
    private readonly pgClient: PgClient,
    private readonly mdfDownloader: Md5Downloader,
    private readonly locations: Locations,
  ) {}
  private async handleNextRecord(
    region: string,
    remoteMd5: string,
    nextMapData: MapDataRecord,
  ) {
    if (
      (remoteMd5 !== nextMapData.pbfMd5 &&
        nextMapData.nextDownloadAfter.getTime() < Date.now()) ||
      nextMapData.status === "error"
    ) {
      const newNextRecord = await this.createNextMapDataRecord(
        region,
        remoteMd5,
      );
      this.logger.debug("discarding and downloading region", {
        remoteMd5,
        routerVersion: this.env.routerVersion,
      });
      await this.pgQueries.mapDataUpdateRecordDiscarded(this.pgClient, {
        id: nextMapData.id,
      });
      await this.pgQueries.regionSetDiscarded(this.pgClient, {
        region: nextMapData.region,
        pbfMd5: nextMapData.pbfMd5,
      });
      await this.downloader.downloadRegion(region, remoteMd5, newNextRecord);
    } else if (nextMapData.status === "new") {
      this.logger.debug("Status new, downloading region");
      await this.downloader.downloadRegion(region, remoteMd5, nextMapData);
    } else if (
      nextMapData.status === "downloaded" ||
      nextMapData.status === "processing" ||
      nextMapData.routerVersion !== this.env.routerVersion
    ) {
      this.logger.debug("Status processing", {
        status: nextMapData.status,
      });
      await this.cacheGenerator.schedule(nextMapData);
    }
  }

  private async createNextMapDataRecord(region: string, remoteMd5: string) {
    const pbfLocation = await this.locations.getPbfFileLoc(region, remoteMd5);
    const kmlLocation = await this.locations.getKmlLocation(region, remoteMd5);
    const nextRecord = await this.pgQueries.mapDataCreateNextRecord(
      this.pgClient,
      {
        region,
        pbfMd5: remoteMd5,
        pbfLocation,
        routerVersion: this.env.routerVersion,
        cacheLocation: await this.locations.getCacheDirLoc(
          region,
          this.env.routerVersion,
          remoteMd5,
        ),
        kmlLocation,
      },
    )!;
    this.logger.debug("Create new next record", { nextRecord });
    return nextRecord!;
  }

  private async handleCurrentRecord(
    region: string,
    remoteMd5: string,
    currentMapData: MapDataRecord | null,
  ) {
    this.logger.debug("Current Map Data Record", { currentMapData });
    if (currentMapData) {
      if (
        remoteMd5 !== currentMapData.pbfMd5 &&
        currentMapData.nextDownloadAfter.getTime() < Date.now()
      ) {
        const newNextRecord = await this.createNextMapDataRecord(
          region,
          remoteMd5,
        );
        this.logger.debug("MD5 differs, downloading");
        await this.downloader.downloadRegion(region, remoteMd5, newNextRecord);
      } else if (currentMapData.routerVersion !== this.env.routerVersion) {
        const newNextRecord = await this.createNextMapDataRecord(
          region,
          remoteMd5,
        );
        this.logger.debug("Router version changed, reporcessing");
        await this.cacheGenerator.schedule(newNextRecord);
      }
    } else {
      const newNextRecord = await this.createNextMapDataRecord(
        region,
        remoteMd5,
      );
      this.logger.debug("no current record, downloading");
      await this.downloader.downloadRegion(region, remoteMd5, newNextRecord);
    }
  }
  async process() {
    this.logger.debug("Starting region list processing");

    await this.pgQueries.servicesUpdateRecordProcessing(this.pgClient, {
      name: "map-data",
    });

    for (const region of this.env.regions) {
      this.logger.debug("Processing region", { region });

      const remoteMd5 = await this.mdfDownloader.getRemoteMd5(region);

      const nextMapData = await this.pgQueries.mapDataGetRecordNext(
        this.pgClient,
        { region },
      );

      this.logger.debug("Next Map Data Record", { nextMapData });

      if (nextMapData) {
        await this.handleNextRecord(region, remoteMd5, nextMapData);
      } else {
        const currentMapData = await this.pgQueries.mapDataGetRecordCurrent(
          this.pgClient,
          { region },
        );
        await this.handleCurrentRecord(region, remoteMd5, currentMapData);
      }
    }

    this.logger.debug("All regions checked");

    await this.cacheGenerator.waitTillDone();

    await this.cleaner.processCleanup();

    await this.handler.checkStatus();
  }
}
