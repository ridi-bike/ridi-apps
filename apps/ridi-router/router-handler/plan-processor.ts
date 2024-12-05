import { RouterStore } from "./router-store.ts";
import { DenoCommand, getDb, pg, RidiLogger } from "@ridi-router/lib";
import { PgClient } from "./pg-client.ts";
import { EnvVariables } from "./env-variables.ts";

export class PlanProcessor {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly logger: RidiLogger,
    private readonly pgClient: PgClient,
    private readonly pgQueries: typeof pg,
    private readonly routerStore: RouterStore,
    private readonly denoCommand: DenoCommand,
    private readonly env: EnvVariables,
  ) {
  }

  async handlePlanNotification(planId: string) {
    const planRecord = await this.pgQueries.planGetById(this.pgClient, {
      id: planId,
    });
    if (!planRecord) {
      this.logger.error("Plan record not found from id", { planId });
      return;
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
      return;
    }

    await this.pgQueries.planSetState(this.pgClient, {
      id: planId,
      state: "planning",
    });
    if (!this.routerStore.isRegionRunning(region.region)) {
      await this.routerStore.startRegion(region.region);
    }

    const { code, stderr, stdout } = await this.denoCommand.execute(
      this.env.routerBin,
      [
        "client",
        "--start",
        `${planRecord.fromLat},${planRecord.fromLon}`,
        "--finish",
        `${planRecord.toLat}, ${planRecord.toLon}`,
        "--socket_name",
        region.region,
      ],
    );

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
      return;
    }

    this.logger.debug("router output", { planId, stdout, stderr });

    const routes = JSON.parse(stdout) as {
      id: string;
      result: string | {
        coords: {
          lat: number;
          lon: number;
        }[];
      }[];
    };

    if (typeof routes.result === "string") {
      this.logger.error("Error returned from router when generating routes", {
        region,
        planId,
        result: routes.result,
      });
      await this.pgQueries.planSetState(this.pgClient, {
        id: planId,
        state: "error",
      });
      return;
    } else {
      for (const route of routes.result) {
        const routeRec = await this.pgQueries.routeInsert(this.pgClient, {
          planId,
          name: "some name",
          userId: planRecord.userId,
        });
        if (!routeRec) {
          this.logger.error("Insert returned no rows", { planId, region });
          return;
        }
        for (const [idx, point] of route.coords.entries()) {
          await this.pgQueries.routePointInsert(this.pgClient, {
            userId: routeRec?.userId,
            routeId: routeRec?.id,
            lat: point.lat.toString(),
            lon: point.lon.toString(),
            sequence: idx.toString(),
          });
        }
      }

      await this.pgQueries.planSetState(this.pgClient, {
        id: planId,
        state: "done",
      });
    }
  }
}
