import { createStoreWithSchema } from "@ridi/store-with-schema";
import { createStore } from "tinybase";

const store = createStore();
export const dataStore = createStoreWithSchema(store);
