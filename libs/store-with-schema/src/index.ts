import { type Store } from "tinybase";

import { storeSchema } from "./schema";
import { withSchema } from "./store-with-schema";

export function createStoreWithSchema(store: Store) {
  return withSchema(store, storeSchema);
}
