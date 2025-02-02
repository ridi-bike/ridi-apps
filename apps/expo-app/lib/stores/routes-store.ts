import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { apiClient } from "../api";
import { getRouteStorage } from "../storage";

type ApiClient = typeof apiClient;

export type Route = NonNullable<
  Awaited<
    ReturnType<
      Awaited<
        ReturnType<
          ApiClient["user"]["routes"][":routeId"]["v"][":version"]["$get"]
        >
      >["json"]
    >
  >["data"]
>;

export function useStoreRoute(routeId: string) {
  const routeStore = useMemo(() => getRouteStorage(routeId), [routeId]);

  const { data, error, status } = useQuery({
    queryKey: ["route", routeId],
    queryFn: () =>
      apiClient.user.routes[":routeId"].v[":version"]
        .$get({
          param: {
            version: routeStore.dataVersion,
            routeId,
          },
        })
        .then((r) => r.json()),
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
