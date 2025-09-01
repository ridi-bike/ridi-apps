import { createStoreWithSchema } from "@ridi/store-with-schema";
import { createMergeableStore } from "tinybase";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import { apiClient, getSuccessResponseOrThrow } from "../api";
import { setUpPersister } from "./persister";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error("API URL missing in EXPO_PUBLIC_API_URL");
}

const store = createMergeableStore();

export async function initSync(userId: string) {
  const token = getSuccessResponseOrThrow(200, await apiClient.syncTokenGet());
  await setUpPersister(store);
  const synchronizer = await createWsSynchronizer(
    store,
    new WebSocket(`${apiUrl}/sync/${userId}?token=${token.token}&action=sync`),
  );
  await synchronizer.startSync();
}

export const dataStore = createStoreWithSchema(store);
