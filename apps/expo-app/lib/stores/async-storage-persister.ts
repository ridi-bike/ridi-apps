import AsyncStorage from "@react-native-async-storage/async-storage";
import { experimental_createPersister } from "@tanstack/query-persist-client-core";

const storage = AsyncStorage;
export const persister = experimental_createPersister({
  storage,
  maxAge: Infinity,
});
