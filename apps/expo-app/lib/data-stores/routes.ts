import { useTable, useRow } from "@ridi/store-with-schema/hooks";
import { type GeoJSON } from "geojson";
import { useMemo, useCallback } from "react";
import { GeoJSONSchema } from "zod-geojson";

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

export function useRouteGeojson(
  routeId: unknown,
  overview: boolean,
): null | GeoJSON {
  const routes = useRow(
    dataStore,
    "routes",
    typeof routeId === "string" ? routeId : "",
  );
  return useMemo(() => {
    if (!routes) {
      return null;
    }
    const json = JSON.parse(
      overview ? routes.coordsOverviewArrayString : routes.coordsArrayString,
    );
    const res = GeoJSONSchema.safeParse(json);
    if (res.success) {
      return res.data as GeoJSON;
    }
    console.error("Failed to validate geojson", res.error);
    return null;
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
