import { getDb } from "@ridi/db-queries";
import { type storeSchema } from "@ridi/store-with-schema";
import { createStoreWithSchema } from "@ridi/store-with-schema";
import { type MergeableStore } from "tinybase";
import { createMergeableStore } from "tinybase";
import { createDurableObjectSqlStoragePersister } from "tinybase/persisters/persister-durable-object-sql-storage";
import { WsServerDurableObject } from "tinybase/synchronizers/synchronizer-ws-server-durable-object";
import { z } from "zod";

import { type StoreWithSchema } from "../../../libs/store-with-schema/src/store-with-schema";

import {
  PlanHandler,
  RegionHandler,
  RouteBreakdownStatHandler,
  RouteHandler,
  RuleSetsHandler,
  RuleSetRoadTagsHandler,
} from "./data-handlers";

const recordSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

const notifyPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INSERT"),
    table: z.string(),
    schema: z.string(),
    record: recordSchema,
    old_record: z.null(),
  }),
  z.object({
    type: z.literal("UPDATE"),
    table: z.string(),
    schema: z.string(),
    record: recordSchema,
    old_record: recordSchema,
  }),
  z.object({
    type: z.literal("DELETE"),
    table: z.string(),
    schema: z.string(),
    record: z.null(),
    old_record: recordSchema,
  }),
]);
export class UserStoreDurableObject extends WsServerDurableObject {
  private store: MergeableStore | null = null;
  private dataStore: StoreWithSchema<typeof storeSchema> | null = null;
  private db: ReturnType<typeof getDb>;

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);

    this.db = getDb(env.SUPABASE_DB_URL);
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
        dataMap.dbReadSchema.parse(payload.old_record),
      );
      this.dataStore.delRow(dataMap.storeTableName, rowId);
    }
    if (payload.type === "INSERT" || payload.type === "UPDATE") {
      const row = dataMap.dbReadSchema.parse(payload.record);
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

    await Promise.all([
      new PlanHandler(this.db, this.dataStore, userId).loadAllFromDb(),
      new RouteHandler(this.db, this.dataStore, userId).loadAllFromDb(),
      new RouteBreakdownStatHandler(
        this.db,
        this.dataStore,
        userId,
      ).loadAllFromDb(),
      new RuleSetsHandler(this.db, this.dataStore, userId).loadAllFromDb(),
      new RuleSetRoadTagsHandler(
        this.db,
        this.dataStore,
        userId,
      ).loadAllFromDb(),
      new RegionHandler(this.db, this.dataStore, userId).loadAllFromDb(),
    ]);
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
