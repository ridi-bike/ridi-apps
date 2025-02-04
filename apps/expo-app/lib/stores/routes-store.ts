import { type RouteGetResponse } from "@ridi/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { apiClient } from "../api";
import { getRouteStorage } from "../storage";

import { getSuccessResponseOrThrow } from "./util";

export type Route = RouteGetResponse["data"];

export function useStoreRoute(routeId: string) {
  const routeStore = useMemo(() => getRouteStorage(routeId), [routeId]);

  const { data, error, status } = useQuery({
    queryKey: ["route", routeId],
    queryFn: () =>
      apiClient
        .routeGet({ params: { routeId }, query: { version: "v1" } })
        .then((r) => getSuccessResponseOrThrow(200, r)),
    initialData: () => {
      const storedData = routeStore.get();
      if (storedData) {
        return {
          data: storedData,
          version: routeStore.dataVersion,
        };
      }
    },
  });

  useEffect(() => {
    if (data && data.data) {
      routeStore.set(data.data);
    }
  }, [data, routeStore]);

  return { data, error, status };
}
