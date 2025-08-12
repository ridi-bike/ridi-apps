import { useRow, useTable } from "@ridi/store-with-schema/hooks";
import { useCallback, useMemo } from "react";
import { generate } from "xksuid";

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

type PlanNew = {
  startLat: number;
  startLon: number;
  finishLat?: number;
  finishLon?: number;
  distance: number;
  bearing?: number;
  tripType: "round-trip" | "start-finish";
  ruleSetId: string;
};

export function usePlansUpdate() {
  const planDelete = useCallback((planId: string) => {
    dataStore.setCell("plans", planId, "isDeleted", true);
  }, []);

  const planCreate = useCallback((planNew: PlanNew) => {
    const planId = generate();
    dataStore.setRow("plans", planId, {
      id: planId,
      ...planNew,
      name: `From: ${planNew.startLat},${planNew.startLon} to ${planNew.finishLat},${planNew.finishLon}`,
      startDesc: `${planNew.startLat},${planNew.startLon}`,
      finishDesc: `${planNew.finishLat},${planNew.finishLon}`,
      state: "new",
      isDeleted: false,
      createdAt: new Date().toISOString(),
    });
    return planId;
  }, []);

  return {
    planDelete,
    planCreate,
  };
}
