import { spawn } from "node:child_process";

import { type RidiLogger } from "@ridi/logger";
import { type RouteReq } from "@ridi/router-service-contracts";
import { NdJson } from "json-nd";

import { env } from "./env.ts";
import { getTagSection } from "./roadTags.ts";

type RoadTagStats = Record<string, { len_m: number; percentage: number }>;
export type RidiRouterErr = { err: string };
export type RidiRouterOk = {
  ok: {
    routes: {
      coords: [number, number][];
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

    const ruleInput = Object.entries(this.req.rules).reduce(
      (rules, [key, value]) => {
        const group = getTagSection(key);
        if (!rules[group]) {
          rules[group] = {};
        }
        rules[group][key] =
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
        Record<
          string,
          { action: "avoid" } | { action: "priority"; value: number }
        >
      >,
    );

    const process = spawn(
      env.ROUTER_BIN,
      this.req.req.tripType === "start-finish"
        ? [
            "start-client",
            "--socket-name",
            env.REGION,
            "--route-req-id",
            `${this.req.reqId}`,
            "start-finish",
            "--start",
            `${this.req.req.start.lat},${this.req.req.start.lon}`,
            "--finish",
            `${this.req.req.finish.lat},${this.req.req.finish.lon}`,
          ]
        : [
            "start-client",
            "--socket-name",
            env.REGION,
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
    process.stdin.write(JSON.stringify(ruleInput));
    process.stdin.end();

    const response = await new Promise<string>((resolve, reject) => {
      let stdout = "";

      process.stdout.on("data", (data) => {
        if (!(data instanceof Buffer)) {
          throw this.logger.error(
            "Data received from router client process on stdout is not a Buffer",
            { data: `${data}` },
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
            { data: `${data}` },
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
            text,
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
      this.logger.error("Router client result not parsable", {
        response,
        error,
      });
      return {
        id: this.req.reqId,
        result: {
          err: "Failed to parse JSON response",
        },
      } as RidiRouterOutput;
    }
  }
}
