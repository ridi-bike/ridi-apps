import { RouterServerManager } from "./router-server-manager.ts";
import { DenoCommand, getDb, pg } from "@ridi-router/lib";
import { RidiLogger } from "@ridi-router/logging/main.ts";
import { PgClient } from "./pg-client.ts";
import { EnvVariables } from "./env-variables.ts";
type RidiRouterErr = { Err: string };
type RidiRouterOk = {
  Ok: {
    coords: {
      lat: number;
      lon: number;
    }[];
  }[];
};
type RidiRouterOutput = {
  id: string;
  result:
    | RidiRouterErr
    | RidiRouterOk;
};

type HandePlanNotificationResult = {
  result: "ok";
} | {
  result: "wait";
  seconds: number;
} | {
  result: "error";
};

export class PlanProcessor {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly logger: RidiLogger,
    private readonly pgClient: PgClient,
    private readonly pgQueries: typeof pg,
    private readonly routerStore: RouterServerManager,
    private readonly denoCommand: DenoCommand,
    private readonly env: EnvVariables,
  ) {
  }

  async handlePlanNotification(
    planId: string,
  ): Promise<HandePlanNotificationResult> {
    const planRecord = await this.pgQueries.planGetById(this.pgClient, {
      id: planId,
    });
    if (!planRecord) {
      this.logger.error("Plan record not found from id", { planId });
      return {
        result: "error",
      };
    }

    const regionsFrom = await this.pgQueries.regionFindFromCoords(
      this.pgClient,
      {
        lat: planRecord.fromLat,
        lon: planRecord.fromLon,
      },
    );
    const regionsTo = await this.pgQueries.regionFindFromCoords(this.pgClient, {
      lat: planRecord.toLat,
      lon: planRecord.toLon,
    });

    const regions = regionsFrom.filter((r) =>
      regionsTo.map((rt) => rt.id).includes(r.id)
    ).map((r) => this.db.mapData.getRecordCurrent(r.region)).filter((r) => !!r)
      .sort((a, b) => (a.cache_size || 0) - (b.cache_size || 0));

    const region = regions[0];

    if (!region) {
      this.logger.error("Current region not found", { region, planId });
      await this.pgQueries.planSetState(this.pgClient, {
        id: planId,
        state: "error",
      });
      return {
        result: "error",
      };
    }

    await this.pgQueries.planSetState(this.pgClient, {
      id: planId,
      state: "planning",
    });
    if (!this.routerStore.isRegionRunning(region.region)) {
      await this.routerStore.startRegion(region.region);
      return {
        result: "wait",
        seconds: 1,
      };
    }

    this.routerStore.startRegionReq(region.region, planId);

    const { code, stdout, stderr } = await this.denoCommand.executeWithStdin(
      this.env.routerBin,
      {
        args: [
          "start-client",
          "--socket-name",
          region.region,
          "start-finish",
          "--start",
          `${planRecord.fromLat},${planRecord.fromLon}`,
          "--finish",
          `${planRecord.toLat},${planRecord.toLon}`,
        ],
        stdinContent: "{}",
      },
    );

    this.routerStore.finishRegionReq(region.region, planId);

    if (code !== 0) {
      this.logger.error("Error returned from router when generating routes", {
        region,
        planId,
        stdout,
        stderr,
        code,
      });
      await this.pgQueries.planSetState(this.pgClient, {
        id: planId,
        state: "error",
      });
      return {
        result: "error",
      };
    }

    this.logger.debug("router output", { planId, stdout, stderr });
    const routes = JSON.parse(stdout) as RidiRouterOutput;

    console.table(routes);

    if (typeof (routes.result as RidiRouterErr).Err === "string") {
      this.logger.error("Error returned from router when generating routes", {
        region,
        planId,
        result: routes.result,
      });
      await this.pgQueries.planSetState(this.pgClient, {
        id: planId,
        state: "error",
      });
      return {
        result: "error",
      };
    }

    const okRoutes = (routes.result as RidiRouterOk).Ok;
    for (const route of okRoutes) {
      await this.pgQueries.routeInsert(this.pgClient, {
        planId,
        name: "some name",
        userId: planRecord.userId,
        latLonArray: route.coords,
      });
    }

    await this.pgQueries.planSetState(this.pgClient, {
      id: planId,
      state: "done",
    });

    return {
      result: "ok",
    };
  }
}
