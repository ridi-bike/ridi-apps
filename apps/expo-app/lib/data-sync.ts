import { apiClient } from "./api";
import {
  getRouteStorage,
  plansPendingStorage,
  plansStorage,
  rulePacksPendingStorage,
  rulePacksStorage,
} from "./storage";
import { getSuccessResponseOrThrow } from "./stores/util";

export async function dataSyncPendingPush() {
  const rulePacksPending = rulePacksPendingStorage.get();
  if (rulePacksPending) {
    while (rulePacksPending.length) {
      const rulePack = rulePacksPending[0]!;
      const result = await apiClient.rulePackUpdate({
        body: {
          version: rulePacksPendingStorage.dataVersion,
          data: rulePack,
        },
      });
      if (result.status !== 201) {
        console.error("Rule Pack Set Error", result.body);
        throw new Error(`Rule Pack Set Error`, { cause: result.body });
      }
      rulePacksPending.shift();
      rulePacksPendingStorage.set(rulePacksPending);
    }
  }
  const plansPending = plansPendingStorage.get();
  if (plansPending) {
    while (plansPending.length) {
      const planPending = plansPending[0]!;
      const result = await apiClient.planCreate({
        body: {
          version: plansPendingStorage.dataVersion,
          data: planPending,
        },
      });
      if (result.status !== 201) {
        console.error("Plan Create Error", result.body);
        throw new Error(`Plan Create Error`, { cause: result.body });
      }
      plansPending.shift();
      plansPendingStorage.set(plansPending);
    }
  }
}

export async function dataSyncPull() {
  const rulePacks = getSuccessResponseOrThrow(
    200,
    await apiClient.rulePacksList({
      query: {
        version: rulePacksStorage.dataVersion,
      },
    }),
  );
  rulePacksStorage.set(rulePacks.data);
  const plans = getSuccessResponseOrThrow(
    200,
    await apiClient.plansList({
      query: {
        version: plansStorage.dataVersion,
      },
    }),
  );
  plansStorage.set(plans.data);
  for (const plan of plans.data) {
    for (const route of plan.routes) {
      const routeStorage = getRouteStorage(route.routeId);
      const localRoute = routeStorage.get();
      if (!localRoute) {
        console.log("route get from sync", route.routeId);
        const remoteRoute = getSuccessResponseOrThrow(
          200,
          await apiClient.routeGet({
            query: {
              version: routeStorage.dataVersion,
            },
            params: {
              routeId: route.routeId,
            },
          }),
        );
        routeStorage.set(remoteRoute.data);
      }
    }
  }
}
