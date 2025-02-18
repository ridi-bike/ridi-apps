import { RidiLogger } from "@ridi/logger";
import { env } from "./env.ts";
import fs from "node:fs";

const logger = RidiLogger.init({
  service: "ridi-router",
  region: env.REGION,
  location: env.MAP_DATA_LOCATION,
});

const KML_FILE_NAME = "map.kml";
const PBF_FILE_NAME = "map.osm.pbf";

logger.info("Starting Map Data init");

const kmlFilename = `${env.MAP_DATA_LOCATION}/${KML_FILE_NAME}`;
const kmlDownloadFilename = `${kmlFilename}.download`;
if (!fs.existsSync(kmlFilename)) {
  logger.info("KML download started");
  const kmlResp = await fetch(env.KML_REMOTE_URL);

  if (!kmlResp.body) {
    throw logger.error("KML fetch response body null", { kmlResp });
  }
  await fs.promises.writeFile(kmlDownloadFilename, kmlResp.body);
  fs.renameSync(kmlDownloadFilename, kmlFilename);

  logger.info("KML download done");
}

const pbfFilename = `${env.MAP_DATA_LOCATION}/${PBF_FILE_NAME}`;
const pbfDownloadFileName = `${pbfFilename}.download`;
if (!fs.existsSync(pbfFilename)) {
  logger.info("PBF download started");
  const pbfResp = await fetch(env.PBF_REMOTE_URL);

  logger.info("PBF File Size", {
    size: pbfResp.headers.get("Content-Length"),
  });

  if (!pbfResp.body) {
    throw logger.error("PBF fetch response body null", { pbfResp });
  }
  await fs.promises.writeFile(pbfDownloadFileName, pbfResp.body);
  fs.renameSync(pbfDownloadFileName, pbfFilename);
  logger.info("PBF download done");
}
