import { dataSyncPendingPush, dataSyncPull } from "./data-sync";

async function backgroundTask() {
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
}

let interval: Timer | null = null;

export async function registerBackgroundFetchAsync() {
  backgroundTask()
    .then(() => console.log("ad hoc init sync task done"))
    .catch((err) => console.log("ad hoc init sync task error", err));
  interval = setInterval(() => backgroundTask(), 1000 * 60);
}

export async function unregisterBackgroundFetchAsync() {
  if (interval) {
    clearInterval(interval);
  }
}
