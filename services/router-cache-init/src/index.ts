import { spawn } from "node:child_process";
import fs from "node:fs";

import { RidiLogger } from "@ridi/logger";
import { NdJson } from "json-nd";

import { env } from "./env.ts";

const logger = RidiLogger.init({
  runTimestamp: Date.now(),
  service: "router-cache-init",
  region: env.REGION,
  routerVersion: env.ROUTER_VERSION,
});

logger.info("Starting Router Cache init", {
  pbfLocation: env.PBF_LOCATION,
  cacheLocation: env.CACHE_LOCATION,
});

try {
  let generateCache = true;

  if (fs.existsSync(env.CACHE_LOCATION)) {
    const metadataFilename = `${env.CACHE_LOCATION}/metadata.json`;
    if (fs.existsSync(metadataFilename)) {
      const metadataFileContents = fs.readFileSync(metadataFilename, {
        encoding: "utf8",
      });
      const metadata = JSON.parse(metadataFileContents) as {
        data_source_hash: string;
        router_version: string;
      };

      if (`v${metadata.router_version}` === env.ROUTER_VERSION) {
        generateCache = false;
      } else {
        logger.warn("Cache exists, overwriting", {
          env,
          metadata,
        });
      }
    }
  }

  if (generateCache) {
    logger.info("Router prep-cache starting");

    const process = spawn(env.ROUTER_BIN, [
      "prep-cache",
      "--input",
      env.PBF_LOCATION,
      "--cache-dir",
      env.CACHE_LOCATION,
    ]);
    await new Promise<void>((resolve, reject) => {
      process.stdout.on("data", (data) => {
        if (!(data instanceof Buffer)) {
          throw logger.error(
            "Data received from router prep-cache process on stdout is not a Buffer",
            { name: `${data}` },
          );
        }

        const buf: Buffer = data;
        const text = buf.toString("utf8");
        try {
          const output = NdJson.parse(text);
          logger.info("ridi-router-output", {
            output: output,
          });
        } catch (error) {
          logger.error("Router prep-cache process output", {
            text,
            error,
          });
        }
      });

      process.stderr.on("data", (data) => {
        if (!(data instanceof Buffer)) {
          throw logger.error(
            "Data received from router prep-cache process on stderr is not a Buffer",
            { name: `${data}` },
          );
        }

        const buf: Buffer = data;
        const text = buf.toString("utf8");
        try {
          const output = NdJson.parse(text);
          logger.info("ridi-router-output", {
            output: output,
          });
        } catch (error) {
          logger.error("Router prep-cache process output", {
            text,
            error,
          });
        }
      });

      process.on("close", (exitCode) => {
        if (exitCode === 0) {
          resolve();
        } else {
          reject(
            logger.error("Router prep-cache process closed with nonzero code", {
              exitCode,
            }),
          );
        }
      });
    });
  }
} catch (error) {
  logger.error("Cache generation failed", { error });
  process.exit(1);
}

logger.info("Starting Router Cache init done");
