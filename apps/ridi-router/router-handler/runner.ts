import { getDb, pg, RidiLogger } from "@ridi-router/lib";
import { EnvVariables } from "./env-variables.ts";
import { PgClient } from "./pg-client.ts";
import { Supabase } from "./supabase.ts";
import { PlanProcessor } from "./plan-processor.ts";

export class Runner {
  constructor(
    private readonly env: EnvVariables,
    private readonly logger: RidiLogger,
    private readonly db: ReturnType<typeof getDb>,
    private readonly pgClient: PgClient,
    private readonly pgQueries: typeof pg,
    private readonly supabase: Supabase,
    private readonly planProcessor: PlanProcessor,
  ) {
  }

  async start() {
    this.logger.debug("Start triggered");

    const handlerRecord = this.db.handlers.get("router");

    if (handlerRecord?.router_version !== this.env.routerVersion) {
      this.db.handlers.createUpdate("router", this.env.routerVersion);

      this.logger.debug("New router version", {
        old: handlerRecord?.router_version,
        new: this.env.routerVersion,
      });
    }
    const nextMapData = this.db.mapData.getRecordsAllNext();
    if (nextMapData.length) {
      this.logger.debug("Next records found", {
        regions: nextMapData.map((r) => r.region),
      });
      if (
        !nextMapData.every((r) => r.router_version === this.env.routerVersion)
      ) {
        this.logger.error(
          "Some 'next' map data records do not have the correct router version",
          { routerVersion: this.env.routerVersion, nextMapData },
        );
        throw new Error("Critical failure");
      }

      this.db.mapData.updateRecordsDemoteCurrent();
      this.db.mapData.updateRecordsPromoteNext();

      await this.pgQueries.regionSetAllPrevious(this.pgClient);
      for (const nextRec of nextMapData) {
        await this.pgQueries.regionSetCurrent(this.pgClient, {
          region: nextRec.region,
          pbfMd5: nextRec.pbf_md5,
        });
      }
    } else {
      const currentMapData = this.db.mapData.getRecordsAllCurrent();
      this.logger.debug("Current records found", {
        regions: currentMapData.map((r) => r.region),
      });
      if (
        !currentMapData.every((r) =>
          r.router_version === this.env.routerVersion
        )
      ) {
        this.logger.error(
          "Some 'current' map data records do not have the correct router version",
          { routerVersion: this.env.routerVersion, nextMapData },
        );
        throw new Error("Critical failure");
      }
    }

    const unsubscribe = await this.supabase.listen(async (planId) => {
      this.logger.debug("Received plan event", { planId });
      await this.planProcessor.handlePlanNotification(planId);
    });

    this.processExistingPlans(); // TODO not awaiting on purpose

    globalThis.addEventListener("unload", () => {
      unsubscribe();
    });

    Deno.serve(
      { port: Number(this.env.port), hostname: "0.0.0.0" },
      async (_req) => {
        const regionCount = await this.pgQueries.regionGetCount(this.pgClient);
        if (this.supabase.isListening() && regionCount?.count) {
          return new Response("Hello, world");
        }
        return new Response(
          JSON.stringify({
            listening: this.supabase.isListening(),
            regionCount: regionCount?.count,
          }),
          {
            status: 500,
          },
        );
      },
    );
  }

  async processExistingPlans() {
    const plans = await this.pgQueries.plansGetNew(this.pgClient);
    for (const plan of plans) {
      this.logger.debug("Processing plan", { planId: plan.id });

      await this.planProcessor.handlePlanNotification(plan.id);
    }
  }
}
