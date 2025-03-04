import {
  type PlanCreateRequest,
  type PlansListResponse,
} from "@ridi/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
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
type SyncStatus = {
  isSyncPending: boolean;
};

export function useStorePlans() {
  const queryClient = useQueryClient();

  const { data, status, isLoading, error, refetch } = useQuery({
    queryKey: [DATA_VERSION, "plans"],
    queryFn: () =>
      apiClient
        .plansList({ query: { version: DATA_VERSION } })
        .then((r) => getSuccessResponseOrThrow(200, r).data),
  });

  const updateLocalPlansListPending = useCallback(
    (planIn: Plan) => {
      queryClient.setQueryData<(Plan & SyncStatus)[]>(
        [DATA_VERSION, "plans"],
        (planList) => {
          if (planList?.some((plan) => plan.id === planIn.id)) {
            return planList.map((plan) => {
              if (plan.id === planIn.id) {
                return { ...planIn, isSyncPending: true };
              }
              return plan;
            });
          }
          return [...(planList || []), { ...planIn, isSyncPending: true }];
        },
      );
    },
    [queryClient],
  );

  const updateLocalPlansListSynced = useCallback(
    (id: string) => {
      queryClient.setQueryData<(Plan & SyncStatus)[]>(
        [DATA_VERSION, "plans"],
        (planList) => {
          if (planList?.some((plan) => plan.id === id)) {
            return planList.map((plan) => {
              if (plan.id === id) {
                return { ...plan, isSyncPending: false };
              }
              return plan;
            });
          }
          return planList;
        },
      );
    },
    [queryClient],
  );

  const { mutate } = useMutation({
    mutationKey: [],
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
        .then((r) => getSuccessResponseOrThrow(201, r).data),
    onMutate: async (plan: Plan) => {
      await queryClient.cancelQueries({
        queryKey: [DATA_VERSION, "plans"],
      });
      updateLocalPlansListPending(plan);
    },
    onSuccess(data) {
      updateLocalPlansListSynced(data.id);
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
          refetch();
        },
      )
      .subscribe();

    return () => {
      plansSub.unsubscribe();
    };
  }, [refetch]);

  return { data, status, isLoading, error, planAdd, refetch };
}
