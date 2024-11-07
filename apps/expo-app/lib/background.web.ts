import { dataSyncPendingPush, dataSyncPull } from "./data-sync";

async function backgroundTask() {
	const now = Date.now();

	try {
		console.log("bg pending sync", now);
		await dataSyncPendingPush();
	} catch (err) {
		console.error("bg push error", err);
	}
	try {
		console.log("bg data pull", now);
		await dataSyncPull();
	} catch (err) {
		console.error("bg data pull error", err);
	}
}

let interval: Timer | null = null;

export async function registerBackgroundFetchAsync() {
	console.log("registered background task");
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
