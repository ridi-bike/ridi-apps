import { NdJson } from "json-nd";
import { RidiLogger } from "@ridi/logger";
import { type RouteReq } from "@ridi/router-service-contracts";

import { spawn } from "node:child_process";
import { env } from "./env.ts";

type RoadTagStats = Record<string, { len_m: number; percentage: number }>;
export type RidiRouterErr = { err: string };
export type RidiRouterOk = {
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
  private req: RouteReq;

  constructor(logger: RidiLogger, req: RouteReq) {
    this.logger = logger.withContext({
      module: "router-client",
      reqId: req.reqId,
    });
    this.req = req;
  }

  async execReq() {
    this.logger.info("Router client starting");

    const process = spawn(
      env.ROUTER_BIN,
      this.req.req.tripType === "start-finish"
        ? [
            "--socket-name",
            env.REGION,
            "start-client",
            "--route-req-id",
            `${this.req.reqId}`,
            "start-finish",
            "--start",
            `${this.req.req.start.lat},${this.req.req.start.lon}`,
            "--finish",
            `${this.req.req.finish.lat},${this.req.req.finish.lon}`,
          ]
        : [
            "--socket-name",
            env.REGION,
            "start-client",
            "--route-req-id",
            `${this.req.reqId}`,
            "round-trip",
            "--start-finish",
            `${this.req.req.startFinish.lat},${this.req.req.startFinish.lon}`,
            "--bearing",
            this.req.req.brearing.toString(),
            "--distance",
            this.req.req.distance.toString(),
          ],
    );
    const ruleInput = Object.entries(this.req.rules).reduce(
      (rules, [key, value]) => {
        rules[key] =
          value === null
            ? {
                action: "avoid",
              }
            : {
                action: "priority",
                value,
              };
        return rules;
      },
      {} as Record<
        string,
        { action: "avoid" } | { action: "priority"; value: number }
      >,
    );
    process.stdin.write(JSON.stringify(ruleInput));
    process.stdin.end();

    const response = await new Promise<string>((resolve, reject) => {
      let stdout = "";

      process.stdout.on("data", (data) => {
        if (!(data instanceof Buffer)) {
          throw this.logger.error(
            "Data received from router client process on stdout is not a Buffer",
            { name: `${data}` },
          );
        }

        const buf: Buffer = data;
        const text = buf.toString("utf8");
        stdout += text;
      });

      process.stderr.on("data", (data) => {
        if (!(data instanceof Buffer)) {
          throw this.logger.error(
            "Data received from router client process on stderr is not a Buffer",
            { name: `${data}` },
          );
        }

        const buf: Buffer = data;
        const text = buf.toString("utf8");
        try {
          const output = NdJson.parse(text);
          this.logger.info("ridi-router-output", {
            output: output,
          });
        } catch (error) {
          this.logger.error("Router client process output", {
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
            this.logger.error(
              "Router client process closed with nonzero code",
              {
                exitCode,
              },
            ),
          );
        }
      });
    });

    try {
      return JSON.parse(response) as RidiRouterOutput;
    } catch (error) {
      throw this.logger.error("Router client result not parsable", {
        response,
        error,
      });
    }
  }
}
