import { spawn } from "node:child_process";

import { type RidiLogger } from "@ridi/logger";
import {
  planWiderRetryMax,
  type RouteReq,
} from "@ridi/router-service-contracts";
import { NdJson } from "json-nd";

import { env } from "./env.ts";
import { getTagSection } from "./roadTags.ts";

type RoadTagStats = Record<string, { len_m: number; percentage: number }>;
export type RidiRouterErr = {
  error: {
    message: string;
  };
};
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

const inputRulesWithBasicDefaults = {
  basic: {
    step_limit: 30000,
    prefer_same_road: {
      enabled: true,
      priority: 30,
    },
    progression_direction: {
      enabled: true,
      check_junctions_back: 50,
    },
    progression_speed: {
      enabled: false,
      check_steps_back: 1000,
      last_step_distance_below_avg_with_ratio: 1.3,
    },
    no_short_detours: {
      enabled: true,
      min_detour_len_m: 5000.0,
    },
    no_sharp_turns: {
      enabled: true,
      under_deg: 150.0,
      priority: 60,
    },
  },
} as const;

type InputRules = {
  basic?: {
    step_limit?: number;
    prefer_same_road?: {
      enabled: boolean;
      priority: number;
    };
    progression_direction?: {
      enabled: boolean;
      check_junctions_back: number;
    };
    progression_speed?: {
      enabled: boolean;
      check_steps_back: number;
      last_step_distance_below_avg_with_ratio: number;
    };
    no_short_detours?: {
      enabled: boolean;
      min_detour_len_m: boolean;
    };
    no_sharp_turns?: {
      enabled: boolean;
      under_deg: number;
      priority: number;
    };
  };
  highway: Record<
    string,
    { action: "avoid" } | { action: "priority"; value: number }
  >;
  surface: Record<
    string,
    { action: "avoid" } | { action: "priority"; value: number }
  >;
  smoothness: Record<
    string,
    { action: "avoid" } | { action: "priority"; value: number }
  >;
};
export class RouterClient {
  private readonly logger: RidiLogger;
  private req: RouteReq;
  private ruleInput: InputRules;
  private readonly requestState: {
    shouldContinue: boolean;
  };
  private requestStateCheck: NodeJS.Timeout | null = null;

  constructor(
    logger: RidiLogger,
    req: RouteReq,
    requestState: {
      shouldContinue: boolean;
    },
  ) {
    this.logger = logger.withContext({
      module: "router-client",
      reqId: req.reqId,
    });
    this.req = req;
    this.requestState = requestState;

    this.ruleInput = Object.entries(this.req.rules).reduce(
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
      {} as InputRules,
    );
  }
  adjustReq(retryAttempt: number): boolean {
    const roundTripBearingStep = 10;
    if (this.req.req.tripType === "round-trip") {
      if (retryAttempt > planWiderRetryMax) {
        return false;
      }

      let bearingAdjustment =
        retryAttempt < planWiderRetryMax / 2
          ? retryAttempt * roundTripBearingStep
          : (planWiderRetryMax / 2 - retryAttempt) * roundTripBearingStep;

      if (bearingAdjustment < 0) {
        bearingAdjustment = 360 + bearingAdjustment;
      }

      this.req = {
        ...this.req,
        req: {
          ...this.req.req,
          brearing: this.req.req.brearing + bearingAdjustment,
        },
      };
      return true;
    }

    if (retryAttempt > planWiderRetryMax) {
      return false;
    }

    this.ruleInput = {
      ...this.ruleInput,
      basic: {
        step_limit:
          inputRulesWithBasicDefaults.basic.step_limit +
          inputRulesWithBasicDefaults.basic.step_limit * 0.25 * retryAttempt,
        progression_direction: {
          enabled: true,
          check_junctions_back:
            inputRulesWithBasicDefaults.basic.progression_direction
              .check_junctions_back +
            inputRulesWithBasicDefaults.basic.progression_direction
              .check_junctions_back *
              0.5 *
              retryAttempt,
        },
      },
    };
    return true;
  }

  async execReq() {
    const bin = env.ROUTER_BIN;
    const args =
      this.req.req.tripType === "start-finish"
        ? [
            "start-client",
            `--socket-name=${env.REGION}`,
            `--route-req-id=${this.req.reqId}`,
            "start-finish",
            `--start=${this.req.req.start.lat},${this.req.req.start.lon}`,
            `--finish=${this.req.req.finish.lat},${this.req.req.finish.lon}`,
          ]
        : [
            "start-client",
            `--socket-name=${env.REGION}`,
            `--route-req-id=${this.req.reqId}`,
            "round-trip",
            `--start-finish=${this.req.req.startFinish.lat},${this.req.req.startFinish.lon}`,
            `--bearing=${this.req.req.brearing.toString()}`,
            `--distance=${this.req.req.distance.toString()}`,
          ];

    const stdin = JSON.stringify(this.ruleInput);

    this.logger.info("Router client starting", {
      bin,
      args,
      reqId: this.req.reqId,
      stdin,
    });

    const process = spawn(bin, args);
    process.stdin.write(stdin);
    process.stdin.end();

    this.requestStateCheck = setInterval(() => {
      if (!this.requestState.shouldContinue) {
        process.kill();
        this.logger.warn("Router client aborted", {
          bin,
          args,
          reqId: this.req.reqId,
        });
      }
    });

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
          this.logger.info("Router client process output", {
            output: output,
          });
        } catch (error) {
          this.logger.error("Router client process output unparsable", {
            text,
            error,
          });
        }
      });

      process.on("close", (exitCode) => {
        if (this.requestStateCheck) {
          clearInterval(this.requestStateCheck);
        }
        if (exitCode === 0) {
          this.logger.info("Router client finished", {
            bin,
            args,
            reqId: this.req.reqId,
            stdin,
          });
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
          error: { message: "Failed to parse JSON response" },
        },
      } as RidiRouterOutput;
    }
  }
}
