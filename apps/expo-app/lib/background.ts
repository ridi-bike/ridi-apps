import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

import { dataSyncPendingPush, dataSyncPull } from "./data-sync";

const BACKGROUND_FETCH_TASK = "background-data-sync";

// 1. Define the task by providing a name and the function that should be executed
// Note: This needs to be called in the global scope (e.g outside of your React components)
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const now = Date.now();

  try {
    await dataSyncPendingPush();
  } catch (err) {
    console.error("bg push error", err);
  }
  try {
    await dataSyncPull();
  } catch (err) {
    console.error("bg data pull error", err);
  }

  // Be sure to return the successful result type!
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// 2. Register the task at some point in your app by providing the same name,
// and some configuration options for how the background fetch should behave
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
export async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 60 * 1, // 1 minute
    stopOnTerminate: false, // android only,
    startOnBoot: true, // android only
  });
}

// 3. (Optional) Unregister tasks by specifying the task name
// This will cancel any future background fetch calls that match the given name
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
export async function unregisterBackgroundFetchAsync() {
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}

// AppState.addEventListener("change", (state) => {
// 	if (state === "active") {
// 		supabase.auth.startAutoRefresh();
// 	} else {
// 		supabase.auth.stopAutoRefresh();
// 	}
// });
