import { getDb } from "@ridi/db-queries";
import { RidiLogger } from "@ridi/logger";
import { Messaging } from "@ridi/messaging";
import { type storeSchema } from "@ridi/store-with-schema";
import { createStoreWithSchema } from "@ridi/store-with-schema";
import postgres from "postgres";
import { type Id, type MergeableStore } from "tinybase";
import { createMergeableStore } from "tinybase";
import { createDurableObjectSqlStoragePersister } from "tinybase/persisters/persister-durable-object-sql-storage";
import { WsServerDurableObject } from "tinybase/synchronizers/synchronizer-ws-server-durable-object";
import { z } from "zod";

import { type StoreWithSchema } from "../../../libs/store-with-schema/src/store-with-schema";

import { dataHandlersDbNames, dataHandlersStoreNames } from "./data-handlers";

export const recordSchema = z.record(z.unknown());

export const notifyPayloadSchema = z.discriminatedUnion("type", [
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
  private messaging: Messaging;
  private userId: string | null = null;
  private listenerId: Id | null = null;

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);

    this.db = getDb(env.SUPABASE_DB_URL);
    this.messaging = new Messaging(
      postgres(env.SUPABASE_DB_URL),
      RidiLogger.init({
        module: "UserStoreDurableObject",
        service: "cfw-api",
      }),
    );
    this.userId =
      this.ctx.getWebSockets().at(0)?.deserializeAttachment().userId || null;
    this.checkAddDataListener();
  }

  private checkAddDataListener() {
    if (!this.userId || this.listenerId) {
      return;
    }

    this.listenerId =
      this.store?.addTablesListener((listenerStore) => {
        const changedTables = listenerStore.getTransactionChanges()[0];
        for (const [changedTableId, changedRows] of Object.entries(
          changedTables,
        )) {
          if (!changedRows) {
            continue;
          }
          const DataHandler =
            dataHandlersStoreNames[
              changedTableId as keyof typeof dataHandlersStoreNames
            ];
          if (!DataHandler) {
            throw new Error(
              `missing mapping, unexpectedted tableId ${changedTableId}`,
            );
          }

          if (this.dataStore) {
            const dataHandler = new DataHandler(
              this.db,
              this.dataStore,
              this.messaging,
            );
            for (const changedRowId of Object.keys(changedRows || {})) {
              dataHandler.loadRowFromStore(changedRowId, this.userId!);
            }
          }
        }
      }) || null;
  }

  private async isTokenOk(token: string, userId: string) {
    const tokenEntry = await this.db
      .selectFrom("private.sync_tokens")
      .select("id")
      .where("id", "=", token)
      .where("user_id", "=", userId)
      .where("created_at", ">=", new Date(Date.now() - 10 * 60 * 1000))
      .executeTakeFirst();
    if (!tokenEntry) {
      return false;
    }
    await this.db
      .deleteFrom("private.sync_tokens")
      .where("id", "=", tokenEntry.id)
      .execute();

    return true;
  }

  async fetch(request: Request): Promise<Response> {
    console.log("===========", request.url);
    if (!this.dataStore) {
      throw new Error("Missing store, something went wrong");
    }
    const url = new URL(request.url);
    const userId = url.pathname.split("/")[2];

    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action");

    if (typeof token !== "string") {
      return new Response("Missing token", { status: 401 });
    }

    if (!this.isTokenOk(token, userId)) {
      return new Response("Invalid token", { status: 401 });
    }

    if (action !== "sync" && action !== "notify") {
      return new Response("Missing action", { status: 400 });
    }

    if (action === "sync") {
      if (!this.dataStore.getInternalStore().getValue("data-synced")) {
        await this.syncAllDataFromDb(userId);
      }

      this.userId = userId;

      this.checkAddDataListener();

      const wsResponse = super.fetch?.(request);
      this.ctx
        .getWebSockets()
        .forEach((ws) => ws.serializeAttachment({ userId: this.userId }));
      return wsResponse || new Response("Internal error", { status: 500 });
    }

    const bodyString = await request.text();
    await this.processNotifyPayload(bodyString, userId);

    return new Response("Ok", { status: 200 });
  }

  async processNotifyPayload(bodyString: string, userId: string) {
    if (!this.dataStore) {
      throw new Error("Missing store, something went wrong");
    }
    if (!this.dataStore.getInternalStore().getValue("data-synced")) {
      return;
    }

    let payload: z.infer<typeof notifyPayloadSchema>;
    try {
      const body = JSON.parse(bodyString);
      const result = notifyPayloadSchema.safeParse(body);
      if (result.success) {
        payload = result.data;
      } else {
        console.error("Failed to validate payload", result.error.toString());
        return;
      }
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

    const DataHandler =
      dataHandlersDbNames[tableId as keyof typeof dataHandlersDbNames];
    if (!DataHandler) {
      throw new Error(`missing mapping, unexpectedted tableId ${tableId}`);
    }

    const dataHandler = new DataHandler(
      this.db,
      this.dataStore,
      this.messaging,
    );

    await dataHandler.loadFromNotify(
      payload.record || payload.old_record,
      payload.type,
      userId,
    );
  }

  async syncAllDataFromDb(userId: string) {
    console.log("===========--------------- sync all");
    if (!this.dataStore) {
      throw new Error("Missing store, something went wrong");
    }

    await Promise.allSettled(
      Object.keys(dataHandlersDbNames).map((handlerKey) => {
        const DataHandler =
          dataHandlersDbNames[handlerKey as keyof typeof dataHandlersDbNames];
        return new DataHandler(
          this.db,
          this.dataStore!,
          this.messaging,
        ).loadAllFromDb(userId);
      }),
    );

    console.log("++++++++++++++++++++ set value");
    this.dataStore.getInternalStore().setValue("data-synced", true);
  }

  createPersister() {
    this.store = createMergeableStore();
    this.dataStore = createStoreWithSchema(this.store);

    return createDurableObjectSqlStoragePersister(
      this.store,
      this.ctx.storage.sql,
      { mode: "fragmented" },
    );
  }
}
