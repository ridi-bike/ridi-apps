import { pino } from "pino";

export class RidiLogger {
  private readonly logger: pino.Logger;
  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  static init(context: Record<string, unknown>) {
    const innerLogger = pino({
      serializers: {
        payload: (data) => {
          return Object.entries(data).reduce(
            (serialized, [key, value]) => {
              if (value instanceof Error) {
                serialized[key] = pino.stdSerializers.err(value);
              } else if (typeof value === "object") {
                serialized[key] = "[stripped-object]";
              } else {
                serialized[key] = value;
              }
              return serialized;
            },
            {} as Record<string, unknown>,
          );
        },
      },
      formatters: {
        level: (label) => {
          return {
            level: label.toUpperCase(),
          };
        },
      },
      level: "trace",
    }).child(context);
    const logger = new RidiLogger(innerLogger);
    return logger;
  }

  public withContext(context: Record<string, unknown>) {
    return new RidiLogger(this.logger.child(context));
  }

  public debug(message: string, payload?: Record<string, unknown>) {
    this.logger.debug({ payload }, message);
  }

  public info(message: string, payload?: Record<string, unknown>) {
    this.logger.info({ payload }, message);
  }

  public warn(message: string, payload?: Record<string, unknown>) {
    this.logger.warn({ payload }, message);
  }

  public error(message: string, payload?: Record<string, unknown>) {
    this.logger.error({ payload }, message);
    return Error(message);
  }
}
