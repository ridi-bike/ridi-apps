import {
  plansListForUserNotDeleted,
  regionGet,
  routeBreakdoiwnStatsListForUserNotDeleted,
  routesListForUserNotDeleted,
  ruleSetRoadTagsListForUserNotDeleted,
  ruleSetsListForUserNotDeleted,
} from "@ridi/db-queries";
import { createStoreWithSchema, storeSchema } from "@ridi/store-with-schema";
import postgres from "postgres";
import { type Id, type IdAddedOrRemoved, type MergeableStore } from "tinybase";
import { createMergeableStore } from "tinybase";
import { createDurableObjectSqlStoragePersister } from "tinybase/persisters/persister-durable-object-sql-storage";
import { WsServerDurableObject } from "tinybase/synchronizers/synchronizer-ws-server-durable-object";
import { type z } from "zod";

import { notifyPayloadSchema, dataMappings } from "./data-mapping";
import { StoreWithSchema } from "../../../libs/store-with-schema/src/store-with-schema";

function recordsToTable<TRet, TRow>(
  rows: TRow[],
  mapFn: (row: TRow) => TRet,
  idGetFn: (row: TRow) => string,
): Record<string, TRet> {
  return rows.reduce(
    (ret, row) => {
      ret[idGetFn(row)] = mapFn(row);
      return ret;
    },
    {} as Record<string, TRet>,
  );
}

export class UserStoreDurableObject extends WsServerDurableObject {
  private store: MergeableStore | null = null;
  private dataStore: StoreWithSchema<typeof storeSchema> | null = null;
  private db: ReturnType<typeof postgres>;

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);

    this.db = postgres(env.SUPABASE_DB_URL);
  }

  private async isTokenOk(token: string) {
    return true;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.pathname.split("/")[2];
    console.log({ userId });
    const action = url.searchParams.get("action");
    const token = url.searchParams.get("token");

    if (typeof token !== "string") {
      return new Response("Missing token", { status: 401 });
    }

    if (!this.isTokenOk(token)) {
      return new Response("Invalid token", { status: 401 });
    }

    if (action !== "sync" && action !== "notify") {
      return new Response("Missing action", { status: 400 });
    }
    if (action === "sync") {
      return (
        super.fetch?.(request) ||
        new Response("Internal error", { status: 500 })
      );
    }

    const bodyString = await request.text();
    this.processNotifyPayload(bodyString);

    return new Response("Ok", { status: 200 });
  }

  processNotifyPayload(bodyString: string) {
    let payload: z.infer<typeof notifyPayloadSchema>;
    try {
      const body = JSON.parse(bodyString);
      payload = notifyPayloadSchema.parse(body);
    } catch (err) {
      console.error("Failed to parse notify payload", err);
      return;
    }

    const tableId = payload.table;

    if (!this.dataStore) {
      throw new Error(
        "something went wrong, store must exist after constructor",
      );
    }

    const dataMap = dataMappings.find((m) => m.dbTableName === tableId);
    if (!dataMap) {
      throw new Error(`missing mapping, unexpectedted tableId ${tableId}`);
    }

    if (payload.type === "DELETE") {
      const rowId = dataMap.idGetterFromDb(
        dataMap.dbSchema.parse(payload.old_record),
      );
      this.dataStore.delRow(dataMap.storeTableName, rowId);
    }
    if (payload.type === "INSERT" || payload.type === "UPDATE") {
      const row = dataMap.dbSchema.parse(payload.record);
      this.dataStore.setRow(
        dataMap.storeTableName,
        dataMap.idGetterFromDb(row),
        dataMap.mapperDbToStore(row),
      );
    }
  }

  async syncAllDataFromDb(userId: string) {
    if (!this.dataStore) {
      throw new Error("Missing store, something went wrong");
    }

    const [plans, routes, routeBreakdowns, ruleSets, ruleSetRoadTags, regions] =
      await Promise.all([
        plansListForUserNotDeleted(this.db, {
          userId,
        }),
        routesListForUserNotDeleted(this.db, {
          userId,
        }),
        routeBreakdoiwnStatsListForUserNotDeleted(this.db, {
          userId,
        }),
        ruleSetsListForUserNotDeleted(this.db, {
          userId,
        }),
        ruleSetRoadTagsListForUserNotDeleted(this.db, {
          userId,
        }),
        regionGet(this.db),
      ]);

    const planMappings = dataMappings.find((m) => m.storeTableName === "plans");
    if (!planMappings) {
      throw new Error("missing mapping");
    }
    this.dataStore.setTable(
      "plans",
      recordsToTable(
        plans,
        planMappings.mapperDbToStore,
        planMappings.idGetterFromDb,
      ),
    );

    const routesMappings = dataMappings.find(
      (m) => m.storeTableName === "routes",
    );
    if (!routesMappings) {
      throw new Error("missing mapping");
    }
    this.dataStore.setTable(
      "routes",
      recordsToTable(
        routes,
        routesMappings.mapperDbToStore,
        routesMappings.idGetterFromDb,
      ),
    );

    const routeBreakdownsMappings = dataMappings.find(
      (m) => m.storeTableName === "routeBreakdowns",
    );
    if (!routeBreakdownsMappings) {
      throw new Error("missing mapping");
    }
    this.dataStore.setTable(
      "routeBreakdowns",
      recordsToTable(
        routeBreakdowns,
        routeBreakdownsMappings.mapperDbToStore,
        routeBreakdownsMappings.idGetterFromDb,
      ),
    );

    const ruleSetsMappings = dataMappings.find(
      (m) => m.storeTableName === "ruleSets",
    );
    if (!ruleSetsMappings) {
      throw new Error("missing mapping");
    }
    this.dataStore.setTable(
      "ruleSets",
      recordsToTable(
        ruleSets,
        ruleSetsMappings.mapperDbToStore,
        ruleSetsMappings.idGetterFromDb,
      ),
    );

    const ruleSetRoadTagsMappings = dataMappings.find(
      (m) => m.storeTableName === "ruleSetRoadTags",
    );
    if (!ruleSetRoadTagsMappings) {
      throw new Error("missing mapping");
    }
    this.dataStore.setTable(
      "ruleSetRoadTags",
      recordsToTable(
        ruleSetRoadTags,
        ruleSetRoadTagsMappings.mapperDbToStore,
        ruleSetRoadTagsMappings.idGetterFromDb,
      ),
    );

    const regionsMappings = dataMappings.find(
      (m) => m.storeTableName === "regions",
    );
    if (!regionsMappings) {
      throw new Error("missing mapping");
    }
    this.dataStore.setTable(
      "regions",
      recordsToTable(
        regions,
        regionsMappings.mapperDbToStore,
        regionsMappings.idGetterFromDb,
      ),
    );
  }

  createPersister() {
    const userId = this.getPathId().split("/")[2];

    this.store = createMergeableStore();
    this.dataStore = createStoreWithSchema(this.store);

    this.store.addTablesListener((listenerStore) => {
      const changedTables = listenerStore.getTransactionChanges()[0];
      for (const [changedTableId, changedRows] of Object.entries(
        changedTables,
      )) {
        const tableMapping = dataMappings.find(
          (m) => m.storeTableName === changedTableId,
        );
        if (tableMapping?.mapperStoreToDb) {
          for (const changedRowId of Object.keys(changedRows || {})) {
            const changedRow = listenerStore.getRow(
              changedTableId,
              changedRowId,
            );
            const dbRow = tableMapping.mapperStoreToDb(
              tableMapping.storeSchema.parse(changedRow),
            );

            tableMapping.writeToDb(this.db, { ...dbRow, userId });
          }
        }
      }
    });

    return createDurableObjectSqlStoragePersister(
      this.store,
      this.ctx.storage.sql,
      { mode: "fragmented" },
    );
  }
}
