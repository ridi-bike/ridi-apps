import { RouterServerManager } from "./router-server-manager.ts";
import { DenoCommand, pg } from "@ridi-router/lib";
import { RidiLogger } from "@ridi-router/logging/main.ts";
import { PgClient } from "@ridi-router/lib";
import { EnvVariables } from "./env-variables.ts";
type RidiRouterErr = { err: string };
type RidiRouterOk = {
  ok: {
    routes: {
      coords: {
        lat: number;
        lon: number;
      }[];
    }[];
  };
};
type RidiRouterOutput = {
  id: string;
  result:
    | RidiRouterErr
    | RidiRouterOk;
};

export class PlanProcessor {
  constructor(
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
  ): Promise<null | number> {
    const planRecord = await this.pgQueries.planGetById(this.pgClient, {
      id: planId,
    });
    if (!planRecord) {
      throw this.logger.error("Plan record not found from id", { planId });
    }

    const regionsFrom = await this.pgQueries.regionFindFromCoords(
      this.pgClient,
      {
        lat: planRecord.startLat,
        lon: planRecord.startLon,
      },
    );
    const regionsTo = await this.pgQueries.regionFindFromCoords(this.pgClient, {
      lat: planRecord.finishLat,
      lon: planRecord.finishLon,
    });

    const regionsProm = await Promise.all(
      regionsFrom.filter((r) => regionsTo.map((rt) => rt.id).includes(r.id))
        .map((r) =>
          this.pgQueries.mapDataGetRecordCurrent(this.pgClient, {
            region: r.region,
          })
        ),
    );
    const regions = regionsProm
      .filter((r) => !!r)
      .sort((a, b) => Number(a?.cacheSize || 0) - Number(b?.cacheSize || 0));

    const region = regions[0];

    if (!region) {
      throw this.logger.error("Current region not found", { region, planId });
    }

    await this.pgQueries.planSetState(this.pgClient, {
      id: planId,
      state: "planning",
    });
    if (!this.routerStore.isRegionRunning(region.region)) {
      await this.routerStore.startRegion(region.region);
      return 1;
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
          `${planRecord.startLat},${planRecord.startLon}`,
          "--finish",
          `${planRecord.finishLat},${planRecord.finishLon}`,
        ],
        stdinContent: "{}",
      },
    );

    this.routerStore.finishRegionReq(region.region, planId);

    if (code !== 0) {
      throw this.logger.error(
        "Error returned from router when generating routes",
        {
          region,
          planId,
          stdout,
          stderr,
          code,
        },
      );
    }

    this.logger.debug("router output", { planId, stdout, stderr });
    const routes = JSON.parse(stdout) as RidiRouterOutput;

    if (typeof (routes.result as RidiRouterErr).err === "string") {
      throw this.logger.error(
        "Error returned from router when generating routes",
        {
          region,
          planId,
          result: routes.result,
        },
      );
    }

    const okRoutes = (routes.result as RidiRouterOk).ok.routes;
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

    return null;
  }
}
