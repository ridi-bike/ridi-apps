import { apiClient } from "./api";
import { getRouteStorage, plansPendingStorage, plansStorage } from "./storage";

export async function dataSyncPendingPush() {
  const plansPending = plansPendingStorage.get();
  if (plansPending) {
    for (const planPending of plansPending) {
      await apiClient.user.plans.create.$post({
        json: {
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
  const plans = await (
    await apiClient.user.plans.all.v[":version"].$get({
      param: {
        version: "v1",
      },
    })
  ).json();
  plansStorage.set(plans.data);
  for (const plan of plans.data) {
    for (const route of plan.routes) {
      const routeStorage = getRouteStorage(route.routeId);
      const localRoute = routeStorage.get();
      if (!localRoute) {
        const remoteRoute = await (
          await apiClient.user.routes[":routeId"].v[":version"].$get({
            param: {
              version: "v1",
              routeId: route.routeId,
            },
          })
        ).json();
        routeStorage.set(remoteRoute.data);
      }
    }
  }
}
