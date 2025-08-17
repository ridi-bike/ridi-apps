import { createStoreWithSchema } from "@ridi/store-with-schema";
import { createMergeableStore } from "tinybase";
import { createIndexedDbPersister } from "tinybase/persisters/persister-indexed-db";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";

const dbName = "ridi-data-db";

export function deleteIndexDb() {
  indexedDB.deleteDatabase(dbName);
}

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error("API URL missing in EXPO_PUBLIC_API_URL");
}

const store = createMergeableStore();

export async function initSync(userId: string) {
  const dataStorePersister = createIndexedDbPersister(store, dbName);
  dataStorePersister.startAutoPersisting();
  const synchronizer = await createWsSynchronizer(
    store,
    new WebSocket(`${apiUrl}/sync/${userId}?token=dfsdfsd&action=sync`),
  );
  await synchronizer.startSync();
}

export const dataStore = createStoreWithSchema(store);
