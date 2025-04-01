import {
  type PlanCreateRequest,
  type PlansListResponse,
} from "@ridi/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { throttle } from "throttle-debounce";
import { generate } from "xksuid";

import { apiClient } from "../api";
import { supabase } from "../supabase";

import { getSuccessResponseOrThrow } from "./util";

const DATA_VERSION = "v1";

export type Plan = PlansListResponse["data"][number];
export type PlanNew = PlanCreateRequest["data"];
type PlanPending = {
  startLat: number;
  startLon: number;
  finishLat: number | null;
  finishLon: number | null;
  distance: number;
  bearing: number | null;
  tripType: "round-trip" | "start-finish";
  ruleSetId: string;
};

export const PLANS_QUERY_KEY = ["plans", DATA_VERSION];

export function useStorePlans() {
  const queryClient = useQueryClient();

  const { data, status, isLoading, error, refetch } = useQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: () =>
      apiClient
        .plansList({ query: { version: DATA_VERSION } })
        .then((r) => getSuccessResponseOrThrow(200, r).data),
  });

  const refetchThrottled = useMemo(() => throttle(5000, refetch), [refetch]);

  const { mutate } = useMutation({
    mutationFn: (plan: Plan) =>
      apiClient
        .planCreate({
          body: {
            version: DATA_VERSION,
            data: {
              ...plan,
              createdAt: new Date(plan.createdAt),
            },
          },
        })
        .then((r) => getSuccessResponseOrThrow(200, r).data),
    onMutate: async (rowIn) => {
      await queryClient.cancelQueries({ queryKey: PLANS_QUERY_KEY });
      queryClient.setQueryData<Plan[]>(PLANS_QUERY_KEY, (plansList) => {
        let update = false;
        const updatedPlanList = plansList
          ? plansList.map((plan) => {
              if (plan.id === rowIn.id) {
                update = true;
                return {
                  ...plan,
                  ...rowIn,
                };
              }
              return plan;
            })
          : [];
        if (!update) {
          return [rowIn, ...updatedPlanList];
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
    },
  });

  const { mutate: mutateDelete, isPending } = useMutation({
    mutationFn: (id: string) =>
      apiClient
        .planDelete({ params: { planId: id } })
        .then((r) => getSuccessResponseOrThrow(204, r)),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PLANS_QUERY_KEY });
      queryClient.setQueryData<Plan[]>(PLANS_QUERY_KEY, (plansList) => {
        return plansList?.filter((p) => p.id !== id);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
    },
  });

  const planAdd = useCallback(
    (planNew: PlanPending) => {
      const id = generate();

      const plan: Plan = {
        id,
        name: `${planNew.startLat},${planNew.startLon} to ${planNew.finishLat},${planNew.finishLon}`,
        startLat: planNew.startLat,
        startLon: planNew.startLon,
        startDesc: `${planNew.startLat},${planNew.startLon}`,
        finishLat: planNew.finishLat,
        finishDesc: `${planNew.finishLat},${planNew.finishLon}`,
        finishLon: planNew.finishLon,
        distance: planNew.distance,
        bearing: planNew.bearing,
        tripType: planNew.tripType,
        createdAt: new Date().toString(),
        ruleSetId: planNew.ruleSetId,
        state: "new",
        mapPreviewDark: null,
        mapPreviewLight: null,
        routes: [],
      };
      mutate(plan);
      return id;
    },
    [mutate],
  );

  useEffect(() => {
    const plansSub = supabase
      .channel(`plans_routes_${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plans" },
        (_payload) => {
          refetchThrottled();
        },
      )
      .subscribe();

    const routesSub = supabase
      .channel(`plans_routes_${Math.random()}`)
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
      routesSub.unsubscribe();
    };
  }, [refetchThrottled]);

  return {
    data,
    status,
    isLoading,
    error,
    planAdd,
    planDelete: mutateDelete,
    planDeleteIsPending: isPending,
    refetch: refetchThrottled,
  };
}
