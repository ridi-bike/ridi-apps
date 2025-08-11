import { type getDb } from "@ridi/db-queries";
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
        finish_lat: row.finishLat !== null ? row.finishLat.toString() : null,
        finish_lon: row.finishLon !== null ? row.finishLon.toString() : null,
        finish_desc: row.finishDesc,
        bearing: row.bearing !== null ? row.bearing.toString() : null,
        distance: row.distance.toString(),
        created_at: new Date(row.createdAt),
        is_deleted: row.isDeleted || false,
        trip_type: row.tripType,
        rule_set_id: row.ruleSetId,
        mapPreviewDark: row.mapPreviewDark,
        mapPreviewLight: row.mapPreviewLight,
        error: null,
        modifiedAt: new Date(),
        region: null,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          name: (eb) => eb.ref("excluded.name"),
          state: (eb) => eb.ref("excluded.state"),
          startLat: (eb) => eb.ref("excluded.startLat"),
          startLon: (eb) => eb.ref("excluded.startLon"),
          startDesc: (eb) => eb.ref("excluded.startDesc"),
          finishLat: (eb) => eb.ref("excluded.finishLat"),
          finishLon: (eb) => eb.ref("excluded.finishLon"),
          finishDesc: (eb) => eb.ref("excluded.finishDesc"),
          bearing: (eb) => eb.ref("excluded.bearing"),
          distance: (eb) => eb.ref("excluded.distance"),
          createdAt: (eb) => eb.ref("excluded.createdAt"),
          isDeleted: (eb) => eb.ref("excluded.isDeleted"),
          tripType: (eb) => eb.ref("excluded.tripType"),
          ruleSetId: (eb) => eb.ref("excluded.ruleSetId"),
          mapPreviewDark: (eb) => eb.ref("excluded.mapPreviewDark"),
          mapPreviewLight: (eb) => eb.ref("excluded.mapPreviewLight"),
          error: (eb) => eb.ref("excluded.error"),
          modifiedAt: (eb) => eb.ref("excluded.modifiedAt"),
          region: (eb) => eb.ref("excluded.region"),
        }),
      )
      .execute();
  }
  private readAllFromDb(userId: string) {
    return this.db
      .selectFrom("plans")
      .where("userId", "=", userId)
      .where("isDeleted", "=", false)
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
      startLat: Number(row.startLat),
      startLon: Number(row.startLon),
      startDesc: row.startDesc,
      finishLat: row.finishLat !== null ? Number(row.finishLat) : null,
      finishLon: row.finishLon !== null ? Number(row.finishLon) : null,
      finishDesc: row.finishDesc,
      bearing: row.bearing !== null ? Number(row.bearing) : null,
      distance: Number(row.distance),
      createdAt: row.createdAt.toISOString(),
      isDeleted: row.isDeleted,
      tripType: row.tripType,
      ruleSetId: row.ruleSetId,
      mapPreviewDark: row.mapPreviewDark,
      mapPreviewLight: row.mapPreviewLight,
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
        .where("userId", "=", userId)
        .where("isDeleted", "=", false)
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
      .where("userId", "=", userId)
      .where("isDeleted", "=", false)
      .selectAll()
      .execute();
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.readAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["routes"]> {
    return {
      id: row.id,
      planId: row.planId,
      createdAt: row.createdAt.toISOString(),
      isDeleted: row.isDeleted,
      downloadedAt: row.downloadedAt?.toISOString() || null,
      junctionCount: Number(row.statsJunctionCount),
      lenM: Number(row.statsLenM),
      name: row.name,
      score: Number(row.statsScore),
      mapPreviewDark: row.mapPreviewDark,
      mapPreviewLight: row.mapPreviewLight,
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
        .selectFrom("routeBreakdownStats")
        .where("userId", "=", userId)
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
      .selectFrom("rule_sets")
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
        .selectFrom("ruleSets")
        .where((eb) =>
          eb.or([eb("userId", "=", userId), eb("userId", "is", null)]),
        )
        .where("isDeleted", "=", false)
        .where("id", "=", rowId)
        .selectAll()
        .executeTakeFirstOrThrow();

      this.dataStore.setRow("ruleSets", rowId, this.rowDb2Store(dbRow));
    }
  }

  async loadRowFromStore(rowId: string, userId: string) {
    const row = this.dataStore.getRow("ruleSets", rowId);

    await this.db
      .insertInto("ruleSets")
      .values({
        id: row.id,
        userId,
        name: row.name,
        defaultSet: false,
        isDeleted: row.isDeleted || false,
        icon: row.icon,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          name: (eb) => eb.ref("excluded.name"),
          defaultSet: (eb) => eb.ref("excluded.defaultSet"),
          isDeleted: (eb) => eb.ref("excluded.isDeleted"),
          icon: (eb) => eb.ref("excluded.icon"),
        }),
      )
      .execute();
  }

  private readAllFromDb(userId: string) {
    return this.db
      .selectFrom("ruleSets")
      .where((eb) =>
        eb.or([eb("userId", "=", userId), eb("userId", "is", null)]),
      )
      .where("isDeleted", "=", false)
      .selectAll()
      .execute();
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.readAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["ruleSets"]> {
    return {
      id: row.id,
      icon: row.icon,
      name: row.name,
      isDefault: false,
      isDeleted: row.isDeleted,
      isSystem: !row.userId,
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
        .selectFrom("ruleSetRoadTags")
        .where((eb) =>
          eb.or([eb("userId", "=", userId), eb("userId", "is", null)]),
        )
        .where("ruleSetId", "=", ruleSetId)
        .where("tagKey", "=", tagKey)
        .selectAll()
        .executeTakeFirstOrThrow();

      this.dataStore.setRow("ruleSetRoadTags", rowId, this.rowDb2Store(dbRow));
    }
  }

  async loadRowFromStore(rowId: string, userId: string) {
    const row = this.dataStore.getRow("ruleSetRoadTags", rowId);

    await this.db
      .insertInto("ruleSetRoadTags")
      .values({
        userId,
        ruleSetId: row.ruleSetId,
        tagKey: row.tag,
        value: row.value,
      })
      .onConflict((oc) =>
        oc
          .column("ruleSetId")
          .column("tagKey")
          .doUpdateSet({
            ruleSetId: (eb) => eb.ref("excluded.ruleSetId"),
            tagKey: (eb) => eb.ref("excluded.tagKey"),
            value: (eb) => eb.ref("excluded.value"),
          }),
      )
      .execute();
  }

  private readAllFromDb(userId: string) {
    return this.db
      .selectFrom("ruleSetRoadTags")
      .where((eb) =>
        eb.or([eb("userId", "=", userId), eb("userId", "is", null)]),
      )
      .selectAll()
      .execute();
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.readAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["ruleSetRoadTags"]> {
    return {
      id: `${row.ruleSetId}-${row.tagKey}`,
      ruleSetId: row.ruleSetId,
      tag: storeSchema.ruleSetRoadTags.shape.tag.parse(row.tagKey),
      value: row.value,
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
