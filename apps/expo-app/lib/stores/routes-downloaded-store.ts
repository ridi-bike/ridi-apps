import { type RouteListDownloadedResponse } from "@ridi/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { throttle } from "throttle-debounce";

import { apiClient } from "../api";
import { supabase } from "../supabase";

import { getSuccessResponseOrThrow } from "./util";

export type RoutesDownloaded = RouteListDownloadedResponse["data"];

const DATA_VERSION = "v1";
export const ROUTES_DOWNLOADED_QUERY_KEY = ["routes", DATA_VERSION];

export function useStoreRoutesDownloaded() {
  const routeQueryKey = useMemo(() => ROUTES_DOWNLOADED_QUERY_KEY, []);

  const { data, error, status, refetch } = useQuery({
    queryKey: routeQueryKey,
    queryFn: () =>
      apiClient
        .routesListDownloaded({ query: { version: DATA_VERSION } })
        .then((r) => getSuccessResponseOrThrow(200, r)),
  });

  const refetchThrottled = useMemo(() => throttle(5000, refetch), [refetch]);

  useEffect(() => {
    const plansSub = supabase
      .channel(`routes_${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routes" },
        (_payload) => {
          refetchThrottled();
        },
      )
      .subscribe();

    return () => {
      plansSub.unsubscribe();
    };
  }, [refetchThrottled]);

  return {
    data,
    error,
    status,
    refetch: refetchThrottled,
  };
}
