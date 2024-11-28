import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
  getLogger,
} from "logger";
import { getOpenTelemetrySink } from "otel";
import { stringify } from "yaml";
import {
  openObserveOrg,
  openObserveToken,
  ridiEnv,
  ridiEnvName,
} from "./env.ts";

await configure({
  sinks: {
    console: getConsoleSink({
      formatter: (record) =>
        ansiColorFormatter(record) +
        (record.properties && Object.keys(record.properties).length > 0
          ? stringify(record.properties, { sortKeys: true }) + "\n"
          : ""),
    }),
    otel: getOpenTelemetrySink({
      diagnostics: true,
      messageType: "array",
      objectRenderer: "json",
      otlpExporterConfig: {
        url: `https://api.openobserve.ai/api/${openObserveOrg}/v1/logs`,
        headers: {
          "Authorization": `Basic ${openObserveToken}`,
          "stream-name": `ridi_${ridiEnvName}`,
        },
      },
    }),
  },
  loggers: [{
    category: [],
    lowestLevel: "debug",
    sinks: ["otel", "console"],
  }],
});

export const ridiLogger = getLogger(ridiEnvName);

ridiLogger.info("Logging set for environment", { ridiEnv, ridiEnvName });
