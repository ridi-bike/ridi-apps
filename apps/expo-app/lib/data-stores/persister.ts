import { Store } from "tinybase";
import * as SQLite from "expo-sqlite";
import { createExpoSqlitePersister } from "tinybase/persisters/persister-expo-sqlite";

const dbName = "ridi-data-db";

export function deletePersister() {
  throw new Error("TODO implement");
}
export async function setUpPersister(store: Store) {
  const db = await SQLite.openDatabaseAsync(dbName);
  const dataStorePersister = createExpoSqlitePersister(store, db);
  dataStorePersister.startAutoPersisting();
}
