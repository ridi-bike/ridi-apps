import { apiClient } from "./api";
import {
  getRouteStorage,
  plansPendingStorage,
  plansStorage,
  ruleSetsDeletedStore,
  ruleSetsPendingStorage,
  ruleSetsStorage,
} from "./storage";
import { getSuccessResponseOrThrow } from "./stores/util";

export async function dataSyncPendingPush() {
  const ruleSetsPending = ruleSetsPendingStorage.get();
  if (ruleSetsPending) {
    while (ruleSetsPending.length) {
      const ruleSet = ruleSetsPending[0]!;
      const result = await apiClient.ruleSetSet({
        body: {
          version: ruleSetsPendingStorage.dataVersion,
          data: ruleSet,
        },
      });
      if (result.status !== 201) {
        console.error("Rule Pack Set Error", result.body);
        throw new Error(`Rule Pack Set Error`, { cause: result.body });
      }
      ruleSetsPending.shift();
      ruleSetsPendingStorage.set(ruleSetsPending);
    }
  }
  const ruleSetsDeleting = ruleSetsDeletedStore.get();
  if (ruleSetsDeleting) {
    while (ruleSetsDeleting.length) {
      const ruleSetId = ruleSetsDeleting[0]!;
      const result = await apiClient.ruleSetDelete({
        body: {
          id: ruleSetId,
        },
      });
      if (result.status !== 204) {
        console.error("Rule Pack Set Error", result.body);
        throw new Error(`Rule Pack Set Error`, { cause: result.body });
      }
      ruleSetsDeleting.shift();
      ruleSetsDeletedStore.set(ruleSetsDeleting);
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
  const ruleSets = getSuccessResponseOrThrow(
    200,
    await apiClient.ruleSetsList({
      query: {
        version: ruleSetsStorage.dataVersion,
      },
    }),
  );
  ruleSetsStorage.set(ruleSets.data);
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
