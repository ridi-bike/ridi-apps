import { RouterServerManager } from "./router-server-manager.ts";
import { DenoCommand, pg } from "@ridi-router/lib";
import { RidiLogger } from "@ridi-router/logging/main.ts";
import { PgClient } from "@ridi-router/lib";
import { EnvVariables } from "./env-variables.ts";
import { ruleSetRoadTagsGet } from "../packages/lib/queries_sql.ts";
import { getTagSection } from "./roadTags.ts";
import { NdJson } from "json-nd";
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

export class PlanProcessor {
  constructor(
    private readonly logger: RidiLogger,
    private readonly pgClient: PgClient,
    private readonly pgQueries: typeof pg,
    private readonly routerStore: RouterServerManager,
    private readonly denoCommand: DenoCommand,
    private readonly env: EnvVariables,
  ) {}

  async handlePlanNotification(planId: string): Promise<null | number> {
    const planRecord = await this.pgQueries.planGetById(this.pgClient, {
      id: planId,
    });
    if (!planRecord) {
      throw this.logger.error("Plan record not found from id", { planId });
    }

    if (planRecord.tripType === "round-trip") {
      if (
        Number(planRecord.bearing).toString() !== planRecord.bearing ||
        Number(planRecord.distance).toString() !== planRecord.distance ||
        Number(planRecord.startLat).toString() !== planRecord.startLat ||
        Number(planRecord.startLon).toString() !== planRecord.startLon
      ) {
        throw this.logger.error(
          "Plan record validation failed for 'round-trip'",
          {
            planId,
            ...planRecord,
          },
        );
      }
    } else {
      if (
        Number(planRecord.startLat).toString() !== planRecord.startLat ||
        Number(planRecord.startLon).toString() !== planRecord.startLon ||
        Number(planRecord.finishLat).toString() !== planRecord.finishLat ||
        Number(planRecord.finishLon).toString() !== planRecord.finishLon
      ) {
        throw this.logger.error(
          "Plan record validation failed for 'start-finish'",
          {
            planId,
            ...planRecord,
          },
        );
      }
    }

    const regionsFrom = await this.pgQueries.regionFindFromCoords(
      this.pgClient,
      {
        lat: planRecord.startLat,
        lon: planRecord.startLon,
      },
    );
    const regionsTo =
      planRecord.finishLat && planRecord.finishLon
        ? await this.pgQueries.regionFindFromCoords(this.pgClient, {
            lat: planRecord.finishLat,
            lon: planRecord.finishLon,
          })
        : null;

    const regionsProm = await Promise.all(
      regionsFrom
        .filter(
          (r) => !regionsTo || regionsTo.map((rt) => rt.id).includes(r.id),
        )
        .map((r) =>
          this.pgQueries.mapDataGetRecordCurrent(this.pgClient, {
            region: r.region,
          }),
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
      this.routerStore.registerRegionReq(region.region, planId);
      return 1;
    }

    this.routerStore.startRegionReq(region.region, planId);

    const rules = await ruleSetRoadTagsGet(this.pgClient, {
      ruleSetId: planRecord.ruleSetId,
    });

    const ruleInput = rules.reduce(
      (all, curr) => {
        const tagSection = getTagSection(curr.tagKey);
        const newRule: { action: string; value?: number } = {
          action: curr.value === null ? "avoid" : "priority",
        };
        if (curr.value !== null) {
          newRule.value = curr.value;
        }
        if (!all[tagSection]) {
          all[tagSection] = {};
        }
        all[tagSection][curr.tagKey] = newRule;
        return all;
      },
      {} as Record<string, Record<string, { action: string; value?: number }>>,
    );

    this.logger.debug("Starting client for plan", {
      planId,
      region: region.region,
      ruleInput,
    });

    const {
      code,
      stdout,
      stderr: stderrString,
    } = await this.denoCommand.executeWithStdin(this.env.routerBin, {
      args:
        planRecord.tripType === "start-finish"
          ? [
              "start-client",
              "--socket-name",
              region.region,
              "--route-req-id",
              `${planRecord.id}`,
              "start-finish",
              "--start",
              `${planRecord.startLat},${planRecord.startLon}`,
              "--finish",
              `${planRecord.finishLat},${planRecord.finishLon}`,
            ]
          : [
              "start-client",
              "--socket-name",
              region.region,
              "--route-req-id",
              `${planRecord.id}`,
              "round-trip",
              "--start-finish",
              `${planRecord.startLat},${planRecord.startLon}`,
              "--bearing",
              planRecord.bearing as string,
              "--distance",
              planRecord.distance,
            ],
      stdinContent: JSON.stringify(ruleInput),
    });

    this.logger.debug("Client finished", { planId, region: region.region });

    let stderr: string | unknown[] = stderrString;
    try {
      stderr = NdJson.parse(stderrString);
    } catch (err) {
      this.logger.error("ridi-router-client unparsable", {
        region: region.region,
        planId,
        stderr,
        err,
      });
    }

    this.routerStore.finishRegionReq(region.region, planId);

    if (!code.success) {
      this.routerStore.forceStopRegion(region.region);
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

    this.logger.debug("router output", { planId, stderr });
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
    const distanceModifier = planRecord.tripType === "round-trip" ? 1 : 2;
    const distance = Number(planRecord.distance);
    const sort = (a: (typeof okRoutes)[number], b: (typeof okRoutes)[number]) =>
      b.stats.score - a.stats.score;
    const filter =
      (fromMod: number | null, toMod: number | null) =>
      (r: (typeof okRoutes)[number]) =>
        (!fromMod || r.stats.len_m > distance * distanceModifier * fromMod) &&
        (!toMod || r.stats.len_m <= distance * distanceModifier * toMod);
    const filterBuckes = [
      filter(0, 1),
      filter(1, 1.5),
      filter(1.5, 2),
      filter(2, 2.5),
      filter(2.5, 3),
      filter(3, 0),
    ];
    const num_of_best_routes = 6;
    const bestRoutes = [];
    if (okRoutes.length <= num_of_best_routes) {
      bestRoutes.push(...okRoutes);
    } else {
      let step = 0;
      while (bestRoutes.length < num_of_best_routes) {
        const bucket = step % num_of_best_routes;
        const iter = Math.floor(step / num_of_best_routes);
        const route = okRoutes.filter(filterBuckes[bucket]).sort(sort)[iter];
        if (route) {
          bestRoutes.push(route);
        }
        step++;
      }
    }
    for (const route of bestRoutes) {
      const routeRecord = await this.pgQueries.routeInsert(this.pgClient, {
        planId,
        name: "some name",
        userId: planRecord.userId,
        latLonArray: route.coords,
        statsLenM: route.stats.len_m.toString(),
        statsJunctionCount: route.stats.junction_count.toString(),
        statsScore: route.stats.score.toString(),
      });
      if (!routeRecord) {
        throw new Error("must exist");
      }
      const inserStats = async (
        statType: "type" | "surface" | "smoothness",
        statsKey: keyof (typeof route)["stats"],
      ) => {
        for (const routeStat of Object.entries(route.stats[statsKey])) {
          await this.pgQueries.routeBreakdownStatsInsert(this.pgClient, {
            userId: planRecord.userId,
            routeId: routeRecord.id,
            statType,
            statName: routeStat[0],
            lenM: routeStat[1].len_m.toString(),
            percentage: routeStat[1].percentage.toString(),
          });
        }
      };
      await inserStats("type", "highway");
      await inserStats("surface", "surface");
      await inserStats("smoothness", "smoothness");
    }

    await this.pgQueries.planSetState(this.pgClient, {
      id: planId,
      state: "done",
    });

    return null;
  }
}
