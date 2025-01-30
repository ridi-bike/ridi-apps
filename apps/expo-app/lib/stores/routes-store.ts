import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { getRouteStorage } from "../storage";
import { trpcClient } from "../supabase";

export type Route = Awaited<
  ReturnType<typeof trpcClient.routes.get.query>
>["data"];

export function useStoreRoute(routeId: string) {
  const routeStore = useMemo(() => getRouteStorage(routeId), [routeId]);

  const { data, error, status } = useQuery({
    queryKey: ["route", routeId],
    queryFn: () =>
      trpcClient.routes.get.query({
        version: routeStore.dataVersion,
        data: { routeId },
      }),
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
    if (data) {
      routeStore.set(data.data);
    }
  }, [data, routeStore]);

  return { data, error, status };
}
