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
    const handlerRecord = this.db.handlers.get("router");
    if (handlerRecord?.router_version !== this.env.routerVersion) {
      this.db.handlers.createUpdate("router", this.env.routerVersion);
      const nextMapData = this.db.mapData.getRecordsAllNext();
      if (nextMapData.length) {
        if (
          !nextMapData.every((r) => r.router_version === this.env.routerVersion)
        ) {
          this.logger.error(
            "Some 'next' map data records do not have the correct router version",
            { routerVersion: this.env.routerVersion, nextMapData },
          );
          throw new Error("Critical failure");
        }

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
    }

    const unsubscribe = await this.supabase.listen(async (id) => {
      this.logger.debug("Received event", { id });
      await this.planProcessor.handlePlanNotification(id);
    });

    globalThis.addEventListener("unload", () => {
      unsubscribe();
    });

    Deno.serve({ port: 2727, hostname: "0.0.0.0" }, async (_req) => {
      const regionCount = await this.pgQueries.regionGetCount(this.pgClient);
      if (this.supabase.isListening() && regionCount?.count) {
        return new Response("Hello, world");
      }
      return new Response("nok", {
        status: 500,
      });
    });
  }
}
