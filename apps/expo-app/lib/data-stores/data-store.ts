import { createStoreWithSchema } from "@ridi/store-with-schema";
import * as SQLite from "expo-sqlite";
import { createMergeableStore } from "tinybase";
import { createExpoSqlitePersister } from "tinybase/persisters/persister-expo-sqlite";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error("API URL missing in EXPO_PUBLIC_API_URL");
}

const store = createMergeableStore();

export async function initSync(userId: string) {
  const db = await SQLite.openDatabaseAsync("databaseName");
  const dataStorePersister = createExpoSqlitePersister(store, db);
  dataStorePersister.startAutoPersisting();
  const synchronizer = await createWsSynchronizer(
    store,
    new WebSocket(`${apiUrl}/sync/${userId}`),
  );
  await synchronizer.startSync();
}

export const dataStore = createStoreWithSchema(store);
