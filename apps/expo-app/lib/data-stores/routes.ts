import { useTable, useRow } from "@ridi/store-with-schema/hooks";
import { useMemo, useCallback } from "react";

import { dataStore } from "./data-store";

export function useRoute(routeId: string) {
  return useRow(dataStore, "routes", routeId);
}

export function useRouteRoadStats(
  routeId: unknown,
  statType: "type" | "surface" | "smoothenss",
) {
  const routeBreakdowns = useTable(dataStore, "routeBreakdowns");
  return useMemo(
    () =>
      routeId !== "string"
        ? []
        : Object.values(routeBreakdowns)
            .filter((rb) => rb.routeId === routeId && rb.statType === statType)
            .sort((a, b) => b.percentage - a.percentage),
    [routeId, routeBreakdowns, statType],
  );
}

export function useRouteCoords(
  routeId: unknown,
  overview: boolean,
): null | [number, number][] {
  const routes = useRow(
    dataStore,
    "routes",
    typeof routeId === "string" ? routeId : "",
  );
  return useMemo(() => {
    if (!routes) {
      return null;
    }
    return JSON.parse(
      overview ? routes.coordsOverviewArrayString : routes.coordsArrayString,
    );
  }, [routes, overview]);
}

export function useRoutesUpdate() {
  const routeDelete = useCallback((routeId: string) => {
    dataStore.setCell("routes", routeId, "isDeleted", true);
  }, []);
  const routeSetDownloaded = useCallback((routeId: string) => {
    dataStore.setCell(
      "routes",
      routeId,
      "downloadedAt",
      new Date().toISOString(),
    );
  }, []);

  return {
    routeDelete,
    routeSetDownloaded,
  };
}

export function useRoutesDownlaoded() {
  const routes = useTable(dataStore, "routes");
  return useMemo(
    () =>
      Object.values(routes).filter(
        (route) => !route.isDeleted && !!route.downloadedAt,
      ),

    [routes],
  );
}
