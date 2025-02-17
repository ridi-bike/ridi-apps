import { NdJson } from "json-nd";
import { env } from "./env";
import { RidiLogger } from "@ridi/logger";
import {
  type RouteReqResponse,
  type RouteReq,
} from "@ridi/ridi-router-contracts";

import { spawn } from "node:child_process";

type RoadTagStats = Record<string, { len_m: number; percentage: number }>;
type RidiRouterErr = { err: string };
type RidiRouterOk = {
  ok: {
    routes: {
      coords: {
        lat: number;
        lon: number;
      }[];
      stats: {
        len_m: number;
        junction_count: number;
        highway: RoadTagStats;
        surface: RoadTagStats;
        smoothness: RoadTagStats;
        score: number;
        cluster: number;
        approximated_route: [
          [number, number],
          [number, number],
          [number, number],
          [number, number],
          [number, number],
          [number, number],
          [number, number],
          [number, number],
          [number, number],
          [number, number],
        ];
      };
    }[];
  };
};

type RidiRouterOutput = {
  id: string;
  result: RidiRouterErr | RidiRouterOk;
};
export class RouterClient {
  private logger: RidiLogger;

  constructor(logger: RidiLogger) {
    this.logger = logger;
  }

  async execReq(req: RouteReq): Promise<RouteReqResponse> {
    const process = spawn(
      "./ridi-router",
      req.req.tripType === "start-finish"
        ? [
            "start-client",
            "--route-req-id",
            `${req.reqId}`,
            "start-finish",
            "--start",
            `${req.req.start.lat},${req.req.start.lon}`,
            "--finish",
            `${req.req.finish.lat},${req.req.finish.lon}`,
          ]
        : [
            "start-client",
            "--route-req-id",
            `${req.reqId}`,
            "round-trip",
            "--start-finish",
            `${req.req.startFinish.lat},${req.req.startFinish.lon}`,
            "--bearing",
            req.req.brearing.toString(),
            "--distance",
            req.req.distance.toString(),
          ],
    );

    const response = await new Promise<string>((resolve, reject) => {
      let stdout = "";

      process.stdout.on("data", (data) => {
        if (typeof data !== "string") {
          throw new Error("stdout not a string");
        }
        stdout += data;
      });

      process.stderr.on("data", (data) => {
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

      process.on("close", (exitCode) => {
        if (exitCode === 0) {
          resolve(stdout);
        } else {
          reject(
            this.logger.error("ridi-router-client-nonzero-exit-code", {
              exitCode,
            }),
          );
        }
      });
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      throw this.logger.error("ridi-router-client-result-parse", {
        response,
        error,
      });
    }
  }
}
