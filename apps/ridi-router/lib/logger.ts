import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
  getLogger,
  type Logger,
} from "logger";
import { flatten } from "flat";
import { stringify } from "yaml";
import { BaseEnvVariables } from "./env.ts";

export class RidiLogger {
  private logger: Logger;

  constructor(private readonly env: BaseEnvVariables) {
    this.initializeLogger(env.ridiEnvName);
    this.logger = getLogger(env.ridiEnvName);
  }

  private async initializeLogger(envName: string) {
    await configure({
      sinks: {
        console: getConsoleSink({
          formatter: (record) =>
            ansiColorFormatter(record) +
            (record.properties && Object.keys(record.properties).length > 0
              ? stringify(record.properties, { sortKeys: true }) + "\n"
              : ""),
        }),
        openObserve: (rec) => {
          fetch(
            `https://api.openobserve.ai/api/${this.env.openObserveOrg}/ridi_${envName}/_json`,
            {
              method: "post",
              headers: {
                "Authorization": `Basic ${this.env.openObserveToken}`,
              },
              body: JSON.stringify([flatten(rec)]),
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
  }

  public debug(message: string, properties?: Record<string, unknown>) {
    this.logger.debug(message, properties);
  }

  public info(message: string, properties?: Record<string, unknown>) {
    this.logger.info(message, properties);
  }

  public warn(message: string, properties?: Record<string, unknown>) {
    this.logger.warn(message, properties);
  }

  public error(message: string, properties?: Record<string, unknown>) {
    this.logger.error(message, properties);
  }
}
const env = new BaseEnvVariables();
export const ridiLogger = new RidiLogger(
  env,
);

ridiLogger.info("Logging set for environment", {
  ridiEnv: env.ridiEnv,
  ridiEnvName: env.ridiEnvName,
});
