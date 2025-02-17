import { NdJson } from "json-nd";
import { env } from "./env";
import { RidiLogger } from "@ridi/logger";

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export class RouterServer {
  private logger: RidiLogger;
  private state: "not-running" | "starting" | "running" | "error" =
    "not-running";
  private process: ChildProcessWithoutNullStreams = spawn("./ridi-router", [
    "start-server",
    "--input",
    env.pbfLocation,
    "--cache-dir",
    env.cacheLocation,
  ]);

  constructor(logger: RidiLogger) {
    this.logger = logger;
    this.state = "starting";
    this.process.stdout.on("data", (data) => {
      if (typeof data !== "string") {
        throw new Error("stdout not a string");
      }
      if (data.split(";").find((t) => t === "RIDI_ROUTER SERVER READY")) {
        this.state = "running";
      }
    });

    this.process.stderr.on("data", (data) => {
      if (typeof data !== "string") {
        throw new Error("stderr not a string");
      }
      try {
        const output = NdJson.parse(data);
        this.logger.info("ridi-router-output", {
          output: output,
        });
      } catch (error) {
        this.logger.error("ridi-server-output-error", {
          data,
          error,
        });
      }
    });

    this.process.on("close", (exitCode) => {
      this.state = exitCode === 0 ? "not-running" : "error";
      this.logger.error("ridi-router-process-stopped", { exitCode });
    });
  }

  public getState() {
    return this.state;
  }
}
