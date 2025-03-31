import { type RidiLogger } from "@ridi/logger";
import { type MapPreviewReq } from "@ridi/map-preview-service-contracts";
import { type ConsoleMessage, type Browser } from "puppeteer";
import puppeteer from "puppeteer";

import { env } from "./env.ts";

export class MapPreviewGenerator {
  private browser: Browser | null = null;
  private state: "running" | "starting" | "not-running" = "not-running";
  private logger: RidiLogger;

  constructor(logger: RidiLogger) {
    this.logger = logger.withContext({ module: "map-preview-generator" });
  }

  public async init() {
    this.browser = await puppeteer.launch({
      executablePath: env.CHROME_BIN,
      headless: !env.PUPPETEER_WINDOWED,
    });
  }

  public getState() {
    return this.state;
  }

  private captureBrowserConsoleMessage(event: ConsoleMessage) {
    switch (event.type()) {
      case "warn":
        this.logger.warn("Browser inner log", {
          type: event.type(),
          text: event.text(),
          stackTrace: event.stackTrace(),
          args: event.args(),
        });
        break;
      case "error":
        this.logger.error("Browser inner log", {
          type: event.type(),
          text: event.text(),
          stackTrace: event.stackTrace(),
          args: event.args(),
        });
        break;
      case "info":
        this.logger.info("Browser inner log", {
          type: event.type(),
          text: event.text(),
          stackTrace: event.stackTrace(),
          args: event.args(),
        });
        break;
      default:
        this.logger.info("Browser inner log", {
          type: event.type(),
          text: event.text(),
          stackTrace: event.stackTrace(),
          args: event.args(),
        });
        break;
    }
  }

  async generatePreview(req: MapPreviewReq): Promise<Uint8Array> {
    if (!this.browser) {
      throw this.logger.error("Broser not ready in map generator", {
        state: this.state,
      });
    }
    const page = await this.browser.newPage();
    page.on("console", (event) => this.captureBrowserConsoleMessage(event));

    await page.goto(`http://127.0.0.1:${env.PORT}?req=${JSON.stringify(req)}`);

    await page.waitForSelector("#map-load-done");

    const mapContainer = await page.waitForSelector("#map-container");
    const imageData = await mapContainer?.screenshot();
    if (!imageData) {
      throw this.logger.error("Faield to capture screenshot", {
        mapContainer,
        imageData,
      });
    }

    await page.close();

    return imageData;
  }
}
