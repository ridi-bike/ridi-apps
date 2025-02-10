import { type RouteGetResponse } from "@ridi/api-contracts";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../api";

import { getSuccessResponseOrThrow } from "./util";

export type Route = RouteGetResponse["data"];

const DATA_VERSION = "v1";

export function useStoreRoute(routeId: string) {
  const { data, error, status } = useQuery({
    queryKey: [DATA_VERSION, "route", routeId],
    queryFn: () =>
      apiClient
        .routeGet({ params: { routeId }, query: { version: DATA_VERSION } })
        .then((r) => getSuccessResponseOrThrow(200, r)),
  });

  return { data, error, status };
}
