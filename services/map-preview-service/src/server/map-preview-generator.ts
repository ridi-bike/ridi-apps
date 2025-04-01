import { type RidiLogger } from "@ridi/logger";
import { type MapPreviewReq } from "@ridi/map-preview-service-contracts";
import { type ConsoleMessage, type Browser } from "puppeteer";
import puppeteer from "puppeteer";

import { env } from "./env.ts";

const renderingTimeout = 60 * 1000;

export class MapPreviewGenerator {
  private browser: Browser | null = null;
  private state: "running" | "starting" | "not-running" = "not-running";
  private logger: RidiLogger;

  constructor(logger: RidiLogger) {
    this.logger = logger.withContext({ module: "map-preview-generator" });
  }

  public async init() {
    this.state = "starting";
    this.browser = await puppeteer.launch({
      executablePath: env.CHROME_BIN,
      headless: !env.PUPPETEER_WINDOWED,
    });
    this.state = "running";
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

  async generatePreview(
    req: MapPreviewReq,
    theme: "dark" | "light",
  ): Promise<Uint8Array> {
    if (!this.browser) {
      throw this.logger.error("Broser not ready in map generator", {
        state: this.state,
      });
    }
    const page = await this.browser.newPage();

    let renderingDoneResolve: (() => void) | null = null;
    let renderingDoneReject: ((reason: unknown) => void) | null = null;

    const renderingDone = new Promise<void>((resolve, reject) => {
      renderingDoneResolve = resolve;
      renderingDoneReject = reject;
    });

    const rejectionTimeout = setTimeout(() => {
      if (!renderingDoneReject) {
        throw this.logger.error("Rendering Done Reject is undefined", {
          renderingDone,
          renderingDoneResolve,
          renderingDoneReject,
        });
      }
      renderingDoneReject(
        this.logger.error("Map rendering timeout", { renderingTimeout }),
      );
    }, renderingTimeout);

    page.on("console", (event) => {
      this.captureBrowserConsoleMessage(event);
      if (event.text() === "RIDI-MAP-RENDERING-DONE") {
        if (!renderingDoneResolve) {
          throw this.logger.error("Rendering Done Resolver is undefined", {
            renderingDone,
            renderingDoneResolve,
            renderingDoneReject,
          });
        }
        clearTimeout(rejectionTimeout);
        renderingDoneResolve();
      }
    });

    const url = new URL("http://127.0.0.1");
    url.port = env.PORT.toString();
    url.searchParams.set("req", JSON.stringify(req));
    url.searchParams.set("theme", theme);
    await page.goto(url.toString());

    await renderingDone;

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
