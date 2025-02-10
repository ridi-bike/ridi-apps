import {
  type PersistedQuery,
  experimental_createPersister,
  type AsyncStorage,
} from "@tanstack/query-persist-client-core";
import { get, set, del, createStore, type UseStore } from "idb-keyval";

function newIdbStorage(idbStore: UseStore): AsyncStorage<PersistedQuery> {
  return {
    getItem: async (key) => await get(key, idbStore),
    setItem: async (key, value) => await set(key, value, idbStore),
    removeItem: async (key) => await del(key, idbStore),
  };
}

const storage = newIdbStorage(createStore("ridi-data", "react-query"));
export const persister = experimental_createPersister<PersistedQuery>({
  storage,
  maxAge: Infinity,
  serialize: (persistedQuery) => persistedQuery,
  deserialize: (cached) => cached,
});
