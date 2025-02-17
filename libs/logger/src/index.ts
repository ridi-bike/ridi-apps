import { pino } from "pino";

export class RidiLogger {
  private readonly logger: pino.Logger;
  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  static init(context: Record<string, unknown>) {
    const innerLogger = pino({
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

  public debug(message: string, properties?: Record<string, unknown>) {
    this.logger.debug(properties, message);
  }

  public info(message: string, properties?: Record<string, unknown>) {
    this.logger.info(properties, message);
  }

  public warn(message: string, properties?: Record<string, unknown>) {
    this.logger.warn(properties, message);
  }

  public error(message: string, properties?: Record<string, unknown>) {
    this.logger.error(properties, message);
    return Error(message);
  }
}
