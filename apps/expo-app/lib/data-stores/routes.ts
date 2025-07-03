import { useTable, useRow } from "@ridi/store-with-schema/hooks";
import { useMemo, useCallback } from "react";

import { dataStore } from "./data-store";

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
  const coords = useRow(
    dataStore,
    "routeCoords",
    typeof routeId === "string" ? routeId : "",
  );
  return useMemo(() => {
    if (!coords) {
      return null;
    }
    return JSON.parse(
      overview ? coords.coordsOverviewArrayString : coords.coordsArrayString,
    );
  }, [coords, overview]);
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
