import { literal, parse, union } from "valibot";
import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
  getLogger,
} from "logger";
import { getOpenTelemetrySink } from "otel";
import { stringify } from "yaml";

const ridiEnv = parse(
  union([literal("local"), literal("prod")]),
  Deno.env.get("RIDI_ENV"),
);

const ridiEnvName = parse(
  union([
    literal("deploy-handler"),
    literal("map-data-handler"),
    literal("router-handler"),
  ]),
  Deno.env.get("RIDI_ENV_NAME"),
);

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
      serviceName: ridiEnvName,
      otlpExporterConfig: {
        url: "http://0.0.0.0:4317",
      },
    }),
  },
  loggers: [{
    category: "logtape",
    lowestLevel: "debug",
    sinks: ridiEnv === "local" ? ["console"] : ["otel", "console"],
  }, {
    category: "meta",
    lowestLevel: "debug",
    sinks: ridiEnv === "local" ? ["console"] : ["otel", "console"],
  }, {
    category: ridiEnvName,
    lowestLevel: "debug",
    sinks: ridiEnv === "local" ? ["console"] : ["otel", "console"],
  }],
});

export const ridiLogger = getLogger(ridiEnvName);

ridiLogger.info("Logging set for environment", { ridiEnv, ridiEnvName });
