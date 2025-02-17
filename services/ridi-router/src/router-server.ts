import { NdJson } from "json-nd";
import { env } from "./env.ts";
import { RidiLogger } from "@ridi/logger";

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export class RouterServer {
  private logger: RidiLogger;
  private state: "not-running" | "starting" | "running" | "error" =
    "not-running";

  private process: ChildProcessWithoutNullStreams;

  constructor(logger: RidiLogger) {
    this.logger = logger.withContext({ module: "router-server" });

    this.state = "starting";

    this.logger.info("Router server starting", {
      bin: env.ROUTER_BIN,
      pbfLocation: env.PBF_LOCATION,
      cacheLocation: env.CACHE_LOCATION,
    });

    this.process = spawn(env.ROUTER_BIN, [
      "start-server",
      "--input",
      env.PBF_LOCATION,
      "--cache-dir",
      env.CACHE_LOCATION,
    ]);

    this.process.stdout.on("data", (data) => {
      if (!(data instanceof Buffer)) {
        throw this.logger.error(
          "Data received from router server process on stdout is not a Buffer",
          { name: `${data}` },
        );
      }

      const buf: Buffer = data;
      const text = buf.toString("utf8");
      if (text.split(";").find((t) => t === "RIDI_ROUTER SERVER READY")) {
        this.state = "running";
        this.logger.info("Router server ready", { text });
      }
    });

    this.process.stderr.on("data", (data) => {
      if (!(data instanceof Buffer)) {
        throw this.logger.error(
          "Data received from router server process on stderr is not a Buffer",
          { name: `${data}` },
        );
      }

      const buf: Buffer = data;
      const text = buf.toString("utf8");
      try {
        const output = NdJson.parse(text);
        this.logger.info("Router server output", {
          output: output,
        });
      } catch (error) {
        this.logger.error("Router server output unparsable", {
          data,
          error,
        });
      }
    });

    this.process.on("close", (exitCode) => {
      this.state = exitCode === 0 ? "not-running" : "error";
      this.logger.error("Router server stopped", { exitCode });
    });
  }

  public getState() {
    return this.state;
  }
}
