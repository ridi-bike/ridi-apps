import { type getDb } from "@ridi/db-queries";
import { type Messaging } from "@ridi/messaging";
import {
  storeSchema,
  type createStoreWithSchema,
} from "@ridi/store-with-schema";
import { type z } from "zod";

import { type recordSchema } from "./notify";

function recordsToTable<TRow>(
  rows: TRow[],
  idGetFn: (row: TRow) => string,
): Record<string, TRow> {
  return rows.reduce(
    (ret, row) => {
      ret[idGetFn(row)] = row;
      return ret;
    },
    {} as Record<string, TRow>,
  );
}

export type BaseHandlerConstructor = new (
  db: ReturnType<typeof getDb>,
  dataStore: ReturnType<typeof createStoreWithSchema>,
  messaging: Messaging,
) => BaseHandler;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface BaseHandler {
  loadAllFromDb(userId: string): Promise<void>;
  loadFromNotify(
    row: z.infer<typeof recordSchema>,
    type: "DELETE" | "INSERT" | "UPDATE",
    userId: string,
  ): Promise<void>;
  loadRowFromStore(rowId: string, userId: string): Promise<void>;
}

export class PlanHandler implements BaseHandler {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
    private readonly messaging: Messaging,
  ) {}
  async loadAllFromDb(userId: string) {
    const dbRows = await this.readAllFromDb(userId);
    this.dataStore.setTable(
      "plans",
      recordsToTable(
        dbRows.map(
          (row): z.infer<(typeof storeSchema)["plans"]> =>
            this.rowDb2Store(row),
        ),
        (r) => r.id,
      ),
    );
  }
  async loadFromNotify(
    row: z.infer<typeof recordSchema>,
    type: "DELETE" | "INSERT" | "UPDATE",
    userId: string,
  ) {
    const rowId = row.id;
    if (rowId !== "string") {
      throw new Error("Unexpected type for row id");
    }
    if (type === "DELETE") {
      this.dataStore.delRow("plans", rowId);
    } else {
      const dbRow = await this.db
        .selectFrom("plans")
        .where("user_id", "=", userId)
        .where("is_deleted", "=", false)
        .where("id", "=", rowId)
        .selectAll()
        .executeTakeFirstOrThrow();

      this.dataStore.setRow("plans", rowId, this.rowDb2Store(dbRow));
    }
  }
  async loadRowFromStore(rowId: string, userId: string) {
    const row = this.dataStore.getRow("plans", rowId);

    const oldPlan = await this.db
      .selectFrom("plans")
      .select("id")
      .where("id", "=", rowId)
      .executeTakeFirst();

    await this.db
      .insertInto("plans")
      .values({
        id: row.id,
        user_id: userId,
        name: row.name,
        state: row.state,
        start_lat: row.startLat.toString(),
        start_lon: row.startLon.toString(),
        start_desc: row.startDesc,
        finish_lat: row.finishLat?.toString(),
        finish_lon: row.finishLon?.toString(),
        finish_desc: row.finishDesc,
        bearing: row.bearing?.toString(),
        distance: row.distance.toString(),
        created_at: new Date(row.createdAt),
        is_deleted: row.isDeleted || false,
        trip_type: row.tripType,
        rule_set_id: row.ruleSetId,
        map_preview_dark: row.mapPreviewDark,
        map_preview_light: row.mapPreviewLight,
        error: undefined, // TODO pick up error
        modified_at: new Date(),
        region: row.region,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          name: (eb) => eb.ref("excluded.name"),
          state: (eb) => eb.ref("excluded.state"),
          start_lat: (eb) => eb.ref("excluded.start_lat"),
          start_lon: (eb) => eb.ref("excluded.start_lon"),
          start_desc: (eb) => eb.ref("excluded.start_desc"),
          finish_lat: (eb) => eb.ref("excluded.finish_lat"),
          finish_lon: (eb) => eb.ref("excluded.finish_lon"),
          finish_desc: (eb) => eb.ref("excluded.finish_desc"),
          bearing: (eb) => eb.ref("excluded.bearing"),
          distance: (eb) => eb.ref("excluded.distance"),
          created_at: (eb) => eb.ref("excluded.created_at"),
          is_deleted: (eb) => eb.ref("excluded.is_deleted"),
          trip_type: (eb) => eb.ref("excluded.trip_type"),
          rule_set_id: (eb) => eb.ref("excluded.rule_set_id"),
          map_preview_dark: (eb) => eb.ref("excluded.map_preview_dark"),
          map_preview_light: (eb) => eb.ref("excluded.map_preview_light"),
          error: (eb) => eb.ref("excluded.error"),
          modified_at: (eb) => eb.ref("excluded.modified_at"),
          region: (eb) => eb.ref("excluded.region"),
        }),
      )
      .execute();
    if (!oldPlan) {
      await this.messaging.send("plan_new", { planId: rowId });
    }
  }
  private readAllFromDb(userId: string) {
    return this.db
      .selectFrom("plans")
      .where("user_id", "=", userId)
      .where("is_deleted", "=", false)
      .selectAll()
      .execute();
  }
  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.readAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["plans"]> {
    return {
      id: row.id,
      name: row.name,
      state: row.state,
      startLat: Number(row.start_lat),
      startLon: Number(row.start_lon),
      startDesc: row.start_desc,
      finishLat:
        row.finish_lat !== undefined ? Number(row.finish_lat) : undefined,
      finishLon:
        row.finish_lon !== undefined ? Number(row.finish_lon) : undefined,
      finishDesc: row.finish_desc ?? undefined,
      bearing: row.bearing !== undefined ? Number(row.bearing) : undefined,
      distance: Number(row.distance),
      createdAt: row.created_at.toISOString(),
      isDeleted: row.is_deleted,
      tripType: row.trip_type,
      ruleSetId: row.rule_set_id,
      mapPreviewDark: row.map_preview_dark ?? undefined,
      mapPreviewLight: row.map_preview_light ?? undefined,
      region: row.region ?? undefined,
    };
  }
}

export class RouteHandler implements BaseHandler {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
  ) {}

  async loadAllFromDb(userId: string) {
    const dbRows = await this.readAllFromDb(userId);
    this.dataStore.setTable(
      "routes",
      recordsToTable(
        dbRows.map((row) => this.rowDb2Store(row)),
        (r) => r.id,
      ),
    );
  }

  async loadFromNotify(
    row: z.infer<typeof recordSchema>,
    type: "DELETE" | "INSERT" | "UPDATE",
    userId: string,
  ) {
    const rowId = row.id;
    if (rowId !== "string") {
      throw new Error("Unexpected type for row id");
    }
    if (type === "DELETE") {
      this.dataStore.delRow("routes", rowId);
    } else {
      const dbRow = await this.db
        .selectFrom("routes")
        .where("user_id", "=", userId)
        .where("is_deleted", "=", false)
        .where("id", "=", rowId)
        .selectAll()
        .executeTakeFirstOrThrow();

      this.dataStore.setRow("routes", rowId, this.rowDb2Store(dbRow));
    }
  }

  async loadRowFromStore(_rowId: string, _userId: string): Promise<void> {
    throw new Error("RouteHandler is read-only - cannot update database");
  }

  private readAllFromDb(userId: string) {
    return this.db
      .selectFrom("routes")
      .where("user_id", "=", userId)
      .where("is_deleted", "=", false)
      .selectAll()
      .execute();
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.readAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["routes"]> {
    return {
      id: row.id,
      planId: row.plan_id,
      createdAt: row.created_at.toISOString(),
      isDeleted: row.is_deleted,
      downloadedAt: row.downloaded_at?.toISOString() || undefined,
      junctionCount: Number(row.stats_junction_count),
      lenM: Number(row.stats_len_m),
      name: row.name,
      score: Number(row.stats_score),
      mapPreviewDark: row.map_preview_dark ?? undefined,
      mapPreviewLight: row.map_preview_light ?? undefined,
      coordsArrayString: row.linestring || "[]",
      coordsOverviewArrayString: row.linestring || "[]",
    };
  }
}

export class RouteBreakdownStatHandler implements BaseHandler {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
  ) {}

  async loadAllFromDb(userId: string) {
    const dbRows = await this.readAllFromDb(userId);
    this.dataStore.setTable(
      "routeBreakdowns",
      recordsToTable(
        dbRows.map((row) => this.rowDb2Store(row)),
        (r) => r.id,
      ),
    );
  }

  async loadFromNotify(
    row: z.infer<typeof recordSchema>,
    type: "DELETE" | "INSERT" | "UPDATE",
    userId: string,
  ) {
    const rowId = row.id;
    if (rowId !== "string") {
      throw new Error("Unexpected type for row id");
    }
    if (type === "DELETE") {
      this.dataStore.delRow("routeBreakdowns", rowId);
    } else {
      const dbRow = await this.db
        .selectFrom("route_breakdown_stats")
        .where("user_id", "=", userId)
        .where("id", "=", rowId)
        .selectAll()
        .executeTakeFirstOrThrow();

      this.dataStore.setRow("routeBreakdowns", rowId, this.rowDb2Store(dbRow));
    }
  }

  async loadRowFromStore(_rowId: string, _userId: string): Promise<void> {
    throw new Error(
      "RouteBreakdownStatHandler is read-only - cannot update database",
    );
  }

  private readAllFromDb(userId: string) {
    return this.db
      .selectFrom("route_breakdown_stats")
      .where("user_id", "=", userId)
      .selectAll()
      .execute();
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.readAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["routeBreakdowns"]> {
    return {
      id: row.id,
      routeId: row.route_id,
      statType: row.stat_type,
      statName: row.stat_name,
      lenM: Number(row.len_m),
      percentage: Number(row.percentage),
    };
  }
}

export class RuleSetsHandler implements BaseHandler {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
  ) {}

  async loadAllFromDb(userId: string) {
    const dbRows = await this.readAllFromDb(userId);
    this.dataStore.setTable(
      "ruleSets",
      recordsToTable(
        dbRows.map((row) => this.rowDb2Store(row)),
        (r) => r.id,
      ),
    );
  }

  async loadFromNotify(
    row: z.infer<typeof recordSchema>,
    type: "DELETE" | "INSERT" | "UPDATE",
    userId: string,
  ) {
    const rowId = row.id;
    if (rowId !== "string") {
      throw new Error("Unexpected type for row id");
    }
    if (type === "DELETE") {
      this.dataStore.delRow("ruleSets", rowId);
    } else {
      const dbRow = await this.db
        .selectFrom("rule_sets")
        .where((eb) =>
          eb.or([eb("user_id", "=", userId), eb("user_id", "is", null)]),
        )
        .where("is_deleted", "=", false)
        .where("id", "=", rowId)
        .selectAll()
        .executeTakeFirstOrThrow();

      this.dataStore.setRow("ruleSets", rowId, this.rowDb2Store(dbRow));
    }
  }

  async loadRowFromStore(rowId: string, userId: string) {
    const row = this.dataStore.getRow("ruleSets", rowId);

    await this.db
      .insertInto("rule_sets")
      .values({
        id: row.id,
        user_id: userId,
        name: row.name,
        default_set: false,
        is_deleted: row.isDeleted || false,
        icon: row.icon,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          name: (eb) => eb.ref("excluded.name"),
          default_set: (eb) => eb.ref("excluded.default_set"),
          is_deleted: (eb) => eb.ref("excluded.is_deleted"),
          icon: (eb) => eb.ref("excluded.icon"),
        }),
      )
      .execute();
  }

  private readAllFromDb(userId: string) {
    return this.db
      .selectFrom("rule_sets")
      .where((eb) =>
        eb.or([eb("user_id", "=", userId), eb("user_id", "is", null)]),
      )
      .where("is_deleted", "=", false)
      .selectAll()
      .execute();
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.readAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["ruleSets"]> {
    return {
      id: row.id,
      icon: row.icon ?? undefined,
      name: row.name,
      isDefault: false,
      isDeleted: row.is_deleted,
      isSystem: !row.user_id,
    };
  }
}

export class RuleSetRoadTagsHandler implements BaseHandler {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
  ) {}

  async loadAllFromDb(userId: string) {
    const dbRows = await this.readAllFromDb(userId);
    this.dataStore.setTable(
      "ruleSetRoadTags",
      recordsToTable(
        dbRows.map((row) => this.rowDb2Store(row)),
        (r) => r.id,
      ),
    );
  }

  async loadFromNotify(
    row: z.infer<typeof recordSchema>,
    type: "DELETE" | "INSERT" | "UPDATE",
    userId: string,
  ) {
    const rowId = row.id;
    if (rowId !== "string") {
      throw new Error("Unexpected type for row id");
    }
    if (type === "DELETE") {
      this.dataStore.delRow("ruleSetRoadTags", rowId);
    } else {
      // Parse the composite ID to get ruleSetId and tagKey
      const [ruleSetId, tagKey] = rowId.split("-");
      const dbRow = await this.db
        .selectFrom("rule_set_road_tags")
        .where((eb) =>
          eb.or([eb("user_id", "=", userId), eb("user_id", "is", null)]),
        )
        .where("rule_set_id", "=", ruleSetId)
        .where("tag_key", "=", tagKey)
        .selectAll()
        .executeTakeFirstOrThrow();

      this.dataStore.setRow("ruleSetRoadTags", rowId, this.rowDb2Store(dbRow));
    }
  }

  async loadRowFromStore(rowId: string, userId: string) {
    const row = this.dataStore.getRow("ruleSetRoadTags", rowId);

    await this.db
      .insertInto("rule_set_road_tags")
      .values({
        user_id: userId,
        rule_set_id: row.ruleSetId,
        tag_key: row.tag,
        value: row.value,
      })
      .onConflict((oc) =>
        oc
          .column("rule_set_id")
          .column("tag_key")
          .doUpdateSet({
            rule_set_id: (eb) => eb.ref("excluded.rule_set_id"),
            tag_key: (eb) => eb.ref("excluded.tag_key"),
            value: (eb) => eb.ref("excluded.value"),
          }),
      )
      .execute();
  }

  private readAllFromDb(userId: string) {
    return this.db
      .selectFrom("rule_set_road_tags")
      .where((eb) =>
        eb.or([eb("user_id", "=", userId), eb("user_id", "is", null)]),
      )
      .selectAll()
      .execute();
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.readAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["ruleSetRoadTags"]> {
    return {
      id: `${row.rule_set_id}-${row.tag_key}`,
      ruleSetId: row.rule_set_id,
      tag: storeSchema.ruleSetRoadTags.shape.tag.parse(row.tag_key),
      value: row.value ?? undefined,
    };
  }
}

export class RegionHandler implements BaseHandler {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
  ) {}

  async loadAllFromDb(_userId: string) {
    console.log("================= loadAllFromDb regions");
    const dbRows = await this.readAllFromDb();
    this.dataStore.setTable(
      "regions",
      recordsToTable(
        dbRows.map((row) => this.rowDb2Store(row)),
        (r) => r.region,
      ),
    );
  }

  async loadFromNotify(
    row: z.infer<typeof recordSchema>,
    type: "DELETE" | "INSERT" | "UPDATE",
    _userId: string,
  ) {
    const region = row.region;
    if (region !== "string") {
      throw new Error("Unexpected type for row id");
    }
    if (type === "DELETE") {
      this.dataStore.delRow("regions", region);
    } else {
      const dbRow = await this.db
        .selectFrom("regions")
        .where("region", "=", region)
        .selectAll()
        .executeTakeFirstOrThrow();

      this.dataStore.setRow("regions", region, this.rowDb2Store(dbRow));
    }
  }

  async loadRowFromStore(_rowId: string, _userId: string): Promise<void> {
    throw new Error("RegionHandler is read-only - cannot update database");
  }

  private readAllFromDb() {
    return this.db.selectFrom("regions").selectAll().execute();
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.readAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["regions"]> {
    return {
      region: row.region,
      geojsonString: JSON.stringify(row.geojson),
    };
  }
}

export const dataHandlers: Record<
  keyof typeof storeSchema,
  BaseHandlerConstructor
> = {
  plans: PlanHandler,
  regions: RegionHandler,
  routeBreakdowns: RouteBreakdownStatHandler,
  routes: RouteHandler,
  ruleSetRoadTags: RuleSetRoadTagsHandler,
  ruleSets: RuleSetsHandler,
};
