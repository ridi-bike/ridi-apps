import { pino } from "pino";

export class RidiLogger {
  constructor(private readonly logger: pino.Logger) {}

  static init(service: string) {
    const innerLogger = pino({
      formatters: {
        level: (label) => {
          return {
            level: label.toUpperCase(),
          };
        },
      },
      level: "trace",
    }).child({
      service,
    });
    const logger = new RidiLogger(innerLogger);
    return logger;
  }

  public forModule(module: string) {
    return new RidiLogger(this.logger.child({ module }));
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
