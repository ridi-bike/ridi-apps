import { RidiLogger } from "@ridi/logger";
import { env } from "./env.ts";
import fs from "node:fs";

const logger = RidiLogger.init({
  service: "map-data-init",
  region: env.REGION,
  location: env.MAP_DATA_LOCATION,
});

logger.info("Starting Map Data init");

const kmlDownloadFilename = `${env.KML_LOCATION}.download`;
if (!fs.existsSync(env.KML_LOCATION)) {
  logger.info("KML download started");
  const kmlResp = await fetch(env.KML_REMOTE_URL);

  if (!kmlResp.body) {
    throw logger.error("KML fetch response body null", { kmlResp });
  }
  await fs.promises.writeFile(kmlDownloadFilename, kmlResp.body);
  fs.renameSync(kmlDownloadFilename, env.KML_LOCATION);

  logger.info("KML download done");
}

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
  await fs.promises.writeFile(pbfDownloadFileName, pbfResp.body);
  fs.renameSync(pbfDownloadFileName, env.PBF_LOCATION);
  logger.info("PBF download done");
}
