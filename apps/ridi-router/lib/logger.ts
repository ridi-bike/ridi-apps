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
    // otel: getOpenTelemetrySink({
    //   diagnostics: true,
    //   otlpExporterConfig: {
    //     url: `https://api.openobserve.ai/api/${openObserveOrg}/v1/logs`,
    //     headers: {
    //       "Authorization": `Basic ${openObserveToken}`,
    //       "stream-name": `ridi_${ridiEnvName}`,
    //     },
    //   },
    // }),
    openObserve: (rec) => {
      fetch(
        `https://api.openobserve.ai/api/${openObserveOrg}/ridi_${ridiEnvName}/_json`,
        {
          method: "post",
          headers: { "Authorization": `Basic ${openObserveToken}` },
          body: JSON.stringify([rec]),
        },
      );
    },
  },
  loggers: [{
    category: [],
    lowestLevel: "debug",
    sinks: ["openObserve", "console"],
  }],
});

export const ridiLogger = getLogger(ridiEnvName);

ridiLogger.info("Logging set for environment", { ridiEnv, ridiEnvName });
