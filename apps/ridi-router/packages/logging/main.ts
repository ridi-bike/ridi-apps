import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
  getLogger,
  type Logger,
} from "logger";
import { flatten } from "flat";
import { stringify } from "yaml";
import type { BaseEnvVariables } from "@ridi-router/env/main.ts";

export function handleMaybeErrors(err: unknown): string | unknown {
  if (!err) {
    return "";
  }
  if (err instanceof Error) {
    return `\n${err.name}: ${err.message}\n${err.stack}\n${
      handleMaybeErrors(err.cause)
    }`;
  }
  return err;
}

export class RidiLogger {
  private static instance: RidiLogger;

  private constructor(
    private readonly logger: Logger,
  ) {
  }

  static async init(env: BaseEnvVariables) {
    await RidiLogger.initializeLogger(env);
    const innerLogger = getLogger(env.ridiEnvName);
    const logger = new RidiLogger(innerLogger);
    RidiLogger.instance = logger;
  }

  public static get(): RidiLogger {
    if (!RidiLogger.instance) {
      throw new Error("need to call init first");
    }
    return RidiLogger.instance;
  }

  private static async initializeLogger(env: BaseEnvVariables) {
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
            `https://api.openobserve.ai/api/${env.openObserveOrg}/ridi_${env.ridiEnvName}/_json`,
            {
              method: "post",
              headers: {
                "Authorization": `Basic ${env.openObserveToken}`,
              },
              body: JSON.stringify([flatten(rec)]),
            },
          );
        },
      },
      loggers: [{
        category: [],
        lowestLevel: "debug",
        sinks: env.ridiEnv === "prod"
          ? ["openObserve", "console"]
          : env.ridiEnv === "local"
          ? ["console"]
          : [],
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
