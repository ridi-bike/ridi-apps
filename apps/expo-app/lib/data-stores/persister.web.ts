import { Store } from "tinybase";
import { createIndexedDbPersister } from "tinybase/persisters/persister-indexed-db";

const dbName = "ridi-data-db";

export function deletePersister() {
  indexedDB.deleteDatabase(dbName);
}
export async function setUpPersister(store: Store) {
  const dataStorePersister = createIndexedDbPersister(store, dbName);
  dataStorePersister.startAutoPersisting();
}
