import fs from "node:fs";
import { type ReadableStream } from "node:stream/web";

import { regionInsertOrUpdate } from "@ridi/db-queries";
import { RidiLogger } from "@ridi/logger";
import { kml } from "@tmcw/togeojson";
import postgres from "postgres";
import { DOMParser } from "xmldom";

import { env } from "./env.ts";

const logger = RidiLogger.init({
  runTimestamp: Date.now(),
  service: "map-data-init",
  region: env.REGION,
  location: env.MAP_DATA_LOCATION,
  remotePbf: env.PBF_REMOTE_URL,
  remoteKml: env.KML_REMOTE_URL,
});

logger.info("Starting Map Data init");

await fs.promises.mkdir(env.MAP_DATA_LOCATION, {
  recursive: true,
});

try {
  const kmlDownloadFilename = `${env.KML_LOCATION}.download`;
  if (!fs.existsSync(env.KML_LOCATION)) {
    logger.info("KML download started");
    const kmlResp = await fetch(env.KML_REMOTE_URL);

    if (!kmlResp.body) {
      throw logger.error("KML fetch response body null", { kmlResp });
    }
    await fs.promises.writeFile(
      kmlDownloadFilename,
      kmlResp.body as ReadableStream<Uint8Array>,
      {
        flag: "w+",
      },
    );
    fs.renameSync(kmlDownloadFilename, env.KML_LOCATION);

    logger.info("KML download done");

    const kmlFileContents = await fs.promises.readFile(env.KML_LOCATION, {
      encoding: "utf8",
    });

    const kmlDom = new DOMParser().parseFromString(kmlFileContents);
    const converted = kml(kmlDom);
    const polygon = converted.features[0]?.geometry;
    if (polygon?.type !== "Polygon") {
      throw logger.error("Unexpected polygon geometry", {
        type: polygon?.type,
      });
    }

    const poligonCoordinates = polygon.coordinates[0];
    if (!poligonCoordinates) {
      throw logger.error("Missing polygon coordinates", {
        polygon,
      });
    }

    const polygonCoordsList = poligonCoordinates
      .map((c) => `${c[0]} ${c[1]}`)
      .join(",");

    const pgClient = postgres(env.SUPABASE_DB_URL);
    await regionInsertOrUpdate(pgClient, {
      region: env.REGION,
      geojson: converted,
      polygon: `POLYGON((${polygonCoordsList}))`,
    });
    logger.info("KML saved to db");
  }
} catch (error) {
  logger.error("Failed to download and process KML", { error });
  process.exit(1);
}

try {
  const pbfDownloadFileName = `${env.PBF_LOCATION}.download`;
  if (!fs.existsSync(env.PBF_LOCATION)) {
    logger.info("PBF download started");
    const pbfResp = await fetch(env.PBF_REMOTE_URL);

    logger.info("PBF File Size", {
      size: pbfResp.headers.get("Content-Length"),
    });

    if (!pbfResp.body) {
      throw logger.error("PBF fetch response body null", { pbfResp });
    }
    await fs.promises.writeFile(
      pbfDownloadFileName,
      pbfResp.body as ReadableStream<Uint8Array>,
      {
        flag: "w+",
      },
    );
    fs.renameSync(pbfDownloadFileName, env.PBF_LOCATION);
    logger.info("PBF download done");
  }
} catch (error) {
  logger.error("Failed to download PBF", { error });
  process.exit(1);
}

logger.info("Starting Map Data init done");
