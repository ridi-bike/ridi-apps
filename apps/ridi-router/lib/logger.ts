import { literal, parse, union } from "valibot";
import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
  getLogger,
} from "logger";
import { stringify } from "yaml";

const ridiEnv = parse(
  union([literal("local"), literal("prod")]),
  Deno.env.get("RIDI_ENV"),
);

await configure({
  sinks: {
    console: getConsoleSink({
      formatter: ridiEnv === "local"
        ? (record) =>
          ansiColorFormatter(record) +
          (record.properties && Object.keys(record.properties).length > 0
            ? stringify(record.properties, { sortKeys: true }) + "\n"
            : "")
        : (record) => JSON.stringify(record),
    }),
  },
  loggers: [
    { category: "ridi", lowestLevel: "debug", sinks: ["console"] },
  ],
});

export const ridiLogger = getLogger("ridi");
