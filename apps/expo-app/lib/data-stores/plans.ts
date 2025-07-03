import { useRow, useTable } from "@ridi/store-with-schema/hooks";
import { useCallback, useMemo } from "react";

import { dataStore } from "./data-store";

export function usePlans() {
  const plans = useTable(dataStore, "plans");
  return useMemo(
    () => Object.values(plans).filter((plan) => !plan.isDeleted),
    [plans],
  );
}

export function usePlan(planId: unknown) {
  return useRow(dataStore, "plans", typeof planId === "string" ? planId : "");
}

export function usePlanRoutes(planId: unknown) {
  const routes = useTable(dataStore, "routes");
  return useMemo(
    () =>
      typeof planId !== "string"
        ? []
        : Object.values(routes).filter(
            (route) => !route.isDeleted && route.planId === planId,
          ),
    [routes, planId],
  );
}

export function usePlanRoute(planId: unknown, routeId: unknown) {
  const routes = useTable(dataStore, "routes");
  return useMemo(
    () =>
      typeof planId !== "string" || typeof routeId !== "string"
        ? null
        : Object.values(routes).find(
            (route) =>
              !route.isDeleted &&
              route.planId === planId &&
              route.id === routeId,
          ) || null,
    [routes, planId, routeId],
  );
}

export function usePlansUpdate() {
  const planDelete = useCallback((planId: string) => {
    dataStore.setCell("plans", planId, "isDeleted", true);
  }, []);

  return {
    planDelete,
  };
}
