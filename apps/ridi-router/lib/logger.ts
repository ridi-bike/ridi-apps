import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
  getLogger,
} from "logger";
import { stringify } from "yaml";

await configure({
  sinks: {
    console: getConsoleSink({
      formatter: (record) =>
        ansiColorFormatter(record) +
        (Object.keys(record.properties).length > 0
          ? stringify(record.properties) + "\n"
          : ""),
    }),
  },
  loggers: [
    { category: "ridi", lowestLevel: "debug", sinks: ["console"] },
  ],
});

export const ridiLogger = getLogger("ridi");
