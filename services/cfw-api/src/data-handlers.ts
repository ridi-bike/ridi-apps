import { type getDb } from "@ridi/db-queries";
import {
  storeSchema,
  type createStoreWithSchema,
} from "@ridi/store-with-schema";
import { type z } from "zod";

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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface BaseHandler {
  loadAllFromDb(): Promise<void>;
  loadFromNotify(
    rowId: string,
    type: "DELETE" | "INSERT" | "UPDATE",
  ): Promise<void>;
  loadRowFromStore(rowId: string): Promise<void>;
}

export class PlanHandler implements BaseHandler {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
    private readonly userId: string,
  ) {}
  async loadAllFromDb() {
    const dbRows = await this.readAllFromDb();
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
  async loadFromNotify(rowId: string, type: "DELETE" | "INSERT" | "UPDATE") {
    if (type === "DELETE") {
      this.dataStore.delRow("plans", rowId);
    } else {
      const dbRow = await this.db
        .selectFrom("plans")
        .where("userId", "=", this.userId)
        .where("isDeleted", "=", false)
        .where("id", "=", rowId)
        .selectAll()
        .executeTakeFirstOrThrow();

      this.dataStore.setRow("plans", rowId, this.rowDb2Store(dbRow));
    }
  }
  async loadRowFromStore(rowId: string) {
    const row = this.dataStore.getRow("plans", rowId);

    await this.db
      .insertInto("plans")
      .values({
        id: row.id,
        userId: this.userId,
        name: row.name,
        state: row.state,
        startLat: row.startLat.toString(),
        startLon: row.startLon.toString(),
        startDesc: row.startDesc,
        finishLat: row.finishLat !== null ? row.finishLat.toString() : null,
        finishLon: row.finishLon !== null ? row.finishLon.toString() : null,
        finishDesc: row.finishDesc,
        bearing: row.bearing !== null ? row.bearing.toString() : null,
        distance: row.distance.toString(),
        createdAt: new Date(row.createdAt),
        isDeleted: row.isDeleted || false,
        tripType: row.tripType,
        ruleSetId: row.ruleSetId,
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
  private readAllFromDb() {
    return this.db
      .selectFrom("plans")
      .where("userId", "=", this.userId)
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

export class RouteHandler {
  private rowsBucket: z.infer<(typeof storeSchema)["routes"]>[] | null = null;

  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
    private readonly userId: string,
  ) {}

  async loadAllFromDb() {
    const dbRows = await this.db
      .selectFrom("routes")
      .where("userId", "=", this.userId)
      .where("isDeleted", "=", false)
      .selectAll()
      .execute();

    this.rowsBucket = dbRows.map(
      (row): z.infer<(typeof storeSchema)["routes"]> => this.rowDb2Store(row),
    );

    return dbRows;
  }

  loadFromDb(row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number]) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }
    this.rowsBucket.push(this.rowDb2Store(row));
  }

  saveToStore() {
    if (!this.rowsBucket) {
      throw new Error("can't load what you don't have");
    }

    this.dataStore.setTable(
      "routes",
      recordsToTable(this.rowsBucket, (r) => r.id),
    );

    this.rowsBucket = null;
  }

  loadRowFromStore(rowId: string) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }

    this.rowsBucket.push(this.dataStore.getRow("routes", rowId));
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number],
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

export class RouteBreakdownStatHandler {
  private rowsBucket:
    | z.infer<(typeof storeSchema)["routeBreakdowns"]>[]
    | null = null;

  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
    private readonly userId: string,
  ) {}

  async loadAllFromDb() {
    const dbRows = await this.db
      .selectFrom("routeBreakdownStats")
      .where("userId", "=", this.userId)
      .selectAll()
      .execute();

    this.rowsBucket = dbRows.map(
      (row): z.infer<(typeof storeSchema)["routeBreakdowns"]> =>
        this.rowDb2Store(row),
    );

    return dbRows;
  }

  loadFromDb(row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number]) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }
    this.rowsBucket.push(this.rowDb2Store(row));
  }

  saveToStore() {
    if (!this.rowsBucket) {
      throw new Error("can't load what you don't have");
    }

    this.dataStore.setTable(
      "routeBreakdowns",
      recordsToTable(this.rowsBucket, (r) => r.id),
    );

    this.rowsBucket = null;
  }

  loadRowFromStore(rowId: string) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }

    this.rowsBucket.push(this.dataStore.getRow("routeBreakdowns", rowId));
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["routeBreakdowns"]> {
    return {
      id: row.id,
      routeId: row.routeId,
      statType: row.statType,
      statName: row.statName,
      lenM: Number(row.lenM),
      percentage: Number(row.percentage),
    };
  }
}

export class RuleSetHandler {
  private rowsBucket: z.infer<(typeof storeSchema)["ruleSets"]>[] | null = null;

  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
    private readonly userId: string,
  ) {}

  async loadAllFromDb() {
    const dbRows = await this.db
      .selectFrom("ruleSets")
      .where((eb) =>
        eb.or([eb("userId", "=", this.userId), eb("userId", "is", null)]),
      )
      .where("isDeleted", "=", false)
      .selectAll()
      .execute();

    this.rowsBucket = dbRows.map(
      (row): z.infer<(typeof storeSchema)["ruleSets"]> => this.rowDb2Store(row),
    );

    return dbRows;
  }

  loadFromDb(row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number]) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }
    this.rowsBucket.push(this.rowDb2Store(row));
  }

  saveToStore() {
    if (!this.rowsBucket) {
      throw new Error("can't load what you don't have");
    }

    this.dataStore.setTable(
      "ruleSets",
      recordsToTable(this.rowsBucket, (r) => r.id),
    );

    this.rowsBucket = null;
  }

  loadRowFromStore(rowId: string) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }

    this.rowsBucket.push(this.dataStore.getRow("ruleSets", rowId));
  }

  async saveToDb() {
    if (!this.rowsBucket) {
      throw new Error("can't load what you don't have");
    }

    await this.db
      .insertInto("ruleSets")
      .values(
        this.rowsBucket.map((row) => ({
          id: row.id,
          userId: this.userId,
          name: row.name,
          defaultSet: false,
          isDeleted: row.isDeleted || false,
          icon: row.icon,
        })),
      )
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

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number],
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

// Rule Set Road Tags Handler (read-write)
export class RuleSetRoadTagsHandler {
  private rowsBucket:
    | z.infer<(typeof storeSchema)["ruleSetRoadTags"]>[]
    | null = null;

  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
    private readonly userId: string,
  ) {}

  async loadAllFromDb() {
    const dbRows = await this.db
      .selectFrom("ruleSetRoadTags")
      .where((eb) =>
        eb.or([eb("userId", "=", this.userId), eb("userId", "is", null)]),
      )
      .selectAll()
      .execute();

    this.rowsBucket = dbRows.map(
      (row): z.infer<(typeof storeSchema)["ruleSetRoadTags"]> =>
        this.rowDb2Store(row),
    );

    return dbRows;
  }

  loadFromDb(row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number]) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }
    this.rowsBucket.push(this.rowDb2Store(row));
  }

  saveToStore() {
    if (!this.rowsBucket) {
      throw new Error("can't load what you don't have");
    }

    this.dataStore.setTable(
      "ruleSetRoadTags",
      recordsToTable(this.rowsBucket, (r) => r.id),
    );

    this.rowsBucket = null;
  }

  loadRowFromStore(rowId: string) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }

    this.rowsBucket.push(this.dataStore.getRow("ruleSetRoadTags", rowId));
  }

  async saveToDb() {
    if (!this.rowsBucket) {
      throw new Error("can't load what you don't have");
    }
    await this.db
      .insertInto("ruleSetRoadTags")
      .values(
        this.rowsBucket.map((row) => ({
          userId: this.userId,
          ruleSetId: row.ruleSetId,
          tagKey: row.tag,
          value: row.value,
        })),
      )
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

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["ruleSetRoadTags"]> {
    return {
      id: `${row.ruleSetId}-${row.tagKey}`,
      ruleSetId: row.ruleSetId,
      tag: storeSchema.ruleSetRoadTags.shape.tag.parse(row.tagKey),
      value: row.value,
    };
  }
}

export class RegionHandler {
  private rowsBucket: z.infer<(typeof storeSchema)["regions"]>[] | null = null;

  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
    private readonly _userId: string,
  ) {}

  async loadAllFromDb() {
    const dbRows = await this.db.selectFrom("regions").selectAll().execute();

    this.rowsBucket = dbRows.map(
      (row): z.infer<(typeof storeSchema)["regions"]> => this.rowDb2Store(row),
    );

    return dbRows;
  }

  loadFromDb(row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number]) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }
    this.rowsBucket.push(this.rowDb2Store(row));
  }

  saveToStore() {
    if (!this.rowsBucket) {
      throw new Error("can't load what you don't have");
    }

    this.dataStore.setTable(
      "regions",
      recordsToTable(this.rowsBucket, (r) => r.region),
    );

    this.rowsBucket = null;
  }

  loadRowFromStore(rowId: string) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }

    this.rowsBucket.push(this.dataStore.getRow("regions", rowId));
  }

  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number],
  ): z.infer<(typeof storeSchema)["regions"]> {
    return {
      region: row.region,
      geojsonString: JSON.stringify(row.geojson),
    };
  }
}
