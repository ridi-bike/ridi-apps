import { apiClient } from "./api";
import { getRouteStorage, plansPendingStorage, plansStorage } from "./storage";
import { getSuccessResponseOrThrow } from "./stores/util";

export async function dataSyncPendingPush() {
  const plansPending = plansPendingStorage.get();
  if (plansPending) {
    for (const planPending of plansPending) {
      await apiClient.planCreate({
        body: {
          version: "v1",
          data: planPending,
        },
      });
      plansPendingStorage.set(
        plansPending.filter((p) => p.id !== planPending.id),
      );
    }
  }
}

export async function dataSyncPull() {
  const plans = getSuccessResponseOrThrow(
    200,
    await apiClient.plansList({
      query: {
        version: "v1",
      },
    }),
  ).body;
  plansStorage.set(plans.data);
  for (const plan of plans.data) {
    for (const route of plan.routes) {
      const routeStorage = getRouteStorage(route.routeId);
      const localRoute = routeStorage.get();
      if (!localRoute) {
        const remoteRoute = getSuccessResponseOrThrow(
          200,
          await apiClient.routeGet({
            query: {
              version: "v1",
            },
            params: {
              routeId: route.routeId,
            },
          }),
        ).body;
        routeStorage.set(remoteRoute.data);
      }
    }
  }
}
