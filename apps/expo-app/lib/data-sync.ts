import { getRouteStorage, plansPendingStorage, plansStorage } from "./storage";
import { trpcClient } from "./supabase";

export async function dataSyncPendingPush() {
	const plansPending = plansPendingStorage.get();
	if (plansPending) {
		for (const planPending of plansPending) {
			await trpcClient.plans.create.mutate({
				version: "v1",
				data: planPending,
			});
			plansPendingStorage.set(
				plansPending.filter((p) => p.id !== planPending.id),
			);
		}
	}
}

export async function dataSyncPull() {
	const plans = await trpcClient.plans.list.query({ version: "v1" });
	plansStorage.set(plans.data);
	for (const plan of plans.data) {
		for (const route of plan.routes) {
			const routeStorage = getRouteStorage(route.routeId);
			const localRoute = routeStorage.get();
			if (!localRoute) {
				const remoteRoute = await trpcClient.routes.get.query({
					version: "v1",
					data: { routeId: route.routeId },
				});
				routeStorage.set(remoteRoute.data);
			}
		}
	}
}
