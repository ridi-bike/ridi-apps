import { type RouteGetResponse } from "@ridi/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { throttle } from "throttle-debounce";

import { apiClient } from "../api";
import { supabase } from "../supabase";
import { type UserResponse } from "../useUser";
import { USER_QUERY_KEY } from "../useUser";

import { type Plan } from "./plans-store";
import { PLANS_QUERY_KEY } from "./plans-store";
import { ROUTES_DOWNLOADED_QUERY_KEY } from "./routes-downloaded-store";
import { getSuccessResponseOrThrow } from "./util";

export type Route = RouteGetResponse["data"];

const DATA_VERSION = "v1";

export function useStoreRoute(routeId: string) {
  const queryClient = useQueryClient();

  const routeQueryKey = useMemo(
    () => ["route", routeId, DATA_VERSION],
    [routeId],
  );

  const { data, error, status, refetch } = useQuery({
    queryKey: routeQueryKey,
    queryFn: () =>
      apiClient
        .routeGet({ params: { routeId }, query: { version: DATA_VERSION } })
        .then((r) => getSuccessResponseOrThrow(200, r)),
  });

  const refetchThrottled = useMemo(() => throttle(5000, refetch), [refetch]);

  const { mutate: mutateDelete } = useMutation({
    mutationFn: (id: string) =>
      apiClient
        .routeDelete({ params: { routeId: id } })
        .then((r) => getSuccessResponseOrThrow(204, r)),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PLANS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: routeQueryKey });
      await queryClient.cancelQueries({
        queryKey: ROUTES_DOWNLOADED_QUERY_KEY,
      });
      queryClient.setQueryData(routeQueryKey, () => undefined);
      queryClient.setQueryData<Plan[]>(PLANS_QUERY_KEY, (plansList) => {
        return plansList?.map((plan) => ({
          ...plan,
          routes: plan.routes.filter((route) => route.routeId !== id),
        }));
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ROUTES_DOWNLOADED_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: routeQueryKey });
    },
  });

  const { mutate: mutateSetDownloaded } = useMutation({
    mutationFn: (params: { id: string; downloadedAt: Date }) =>
      apiClient
        .routeSetDownloadedAt({
          params: {
            routeId: params.id,
          },
          body: {
            version: "v1",
            data: {
              downloadedAt: params.downloadedAt.getTime(),
            },
          },
        })
        .then((r) => getSuccessResponseOrThrow(200, r)),
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: USER_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PLANS_QUERY_KEY });
      await queryClient.cancelQueries({
        queryKey: ROUTES_DOWNLOADED_QUERY_KEY,
      });
      await queryClient.cancelQueries({ queryKey: routeQueryKey });
      queryClient.setQueryData<UserResponse>(USER_QUERY_KEY, (user) => {
        if (!user) {
          return user;
        }
        return {
          ...user,
          data: {
            ...user.data,
            downloadCountRemain: user.data.downloadCountRemain - 1,
          },
        };
      });
      queryClient.setQueryData(routeQueryKey, () => undefined);
      queryClient.setQueryData<Plan[]>(PLANS_QUERY_KEY, (plansList) => {
        return plansList?.map((plan) => ({
          ...plan,
          routes: plan.routes.map((route) => {
            if (route.routeId !== params.id) {
              return {
                ...route,
                downloadedAt: params.downloadedAt.toString(),
              };
            }
            return route;
          }),
        }));
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ROUTES_DOWNLOADED_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: routeQueryKey });
    },
  });

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
    routeDelete: mutateDelete,
    routeSetDownloaded: mutateSetDownloaded,
  };
}
