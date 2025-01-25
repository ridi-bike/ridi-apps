import { pino } from "pino";

export class RidiLogger {
  private static instance: RidiLogger;

  private constructor(
    private readonly logger: pino.Logger,
  ) {
  }

  static init(service: string) {
    const innerLogger = pino({
      level: "trace",
    }).child({
      service,
    });
    const logger = new RidiLogger(innerLogger);
    RidiLogger.instance = logger;
  }

  public static get(): RidiLogger {
    if (!RidiLogger.instance) {
      throw new Error("need to call init first");
    }
    return RidiLogger.instance;
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
