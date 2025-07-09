import { type getDb } from "@ridi/db-queries";
import {
  type createStoreWithSchema,
  type storeSchema,
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

export class PlanHandler {
  private rowsBucket: z.infer<(typeof storeSchema)["plans"]>[] | null = null;
  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly dataStore: ReturnType<typeof createStoreWithSchema>,
    private readonly userId: string,
  ) {}
  async loadAllFromDb() {
    const dbRows = await this.db
      .selectFrom("plans")
      .where("userId", "=", this.userId)
      .where("isDeleted", "=", false)
      .selectAll()
      .execute();

    this.rowsBucket = dbRows.map(
      (row): z.infer<(typeof storeSchema)["plans"]> => this.rowDb2Store(row),
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
      "plans",
      recordsToTable(this.rowsBucket, (r) => r.id),
    );

    this.rowsBucket = null;
  }

  loadRowFromStore(rowId: string) {
    if (!this.rowsBucket) {
      this.rowsBucket = [];
    }

    this.rowsBucket.push(this.dataStore.getRow("plans", rowId));
  }

  async saveToDb() {
    if (!this.rowsBucket) {
      throw new Error("can't load what you don't have");
    }
    await this.db
      .insertInto("plans")
      .values(
        this.rowsBucket.map((row) => ({
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
        })),
      )
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
  private rowDb2Store(
    row: Awaited<ReturnType<typeof this.loadAllFromDb>>[number],
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
