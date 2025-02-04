import {
  type PlanCreateRequest,
  type PlansListResponse,
} from "@ridi/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generate } from "xksuid";

import { apiClient } from "../api";
import { dataSyncPendingPush } from "../data-sync";
import { plansPendingStorage, plansStorage } from "../storage";
import { supabase } from "../supabase";

import { getSuccessResponseOrThrow } from "./util";

export type Plan = PlansListResponse["data"][number];
export type PlanNew = PlanCreateRequest["data"];

export function useStorePlans() {
  const [plansPending, setPlansPending] = useState(
    plansPendingStorage.get() || [],
  );

  const refresh = useCallback(() => {
    setPlansPending(plansPendingStorage.get() || []);
  }, []);

  useFocusEffect(refresh);

  const { data, error, status, refetch } = useQuery({
    queryKey: ["plans"],
    queryFn: () =>
      apiClient
        .plansList({ query: { version: plansStorage.dataVersion } })
        .then((r) => getSuccessResponseOrThrow(200, r)),
    initialData: {
      version: plansStorage.dataVersion,
      data: plansStorage.get() || [],
    },
  });

  useEffect(() => {
    if (data) {
      plansStorage.set(data.data);
    }
  }, [data]);

  const dataWithPending = useMemo((): Plan[] => {
    const plans: Plan[] = plansPending.map((p) => ({
      ...p,
      state: "new",
      startDesc: `${p.startLat}, ${p.startLon}`,
      finishDesc: `$${p.finishLat}, ${p.finishLon}`,
      createdAt: p.createdAt.toString(),
      routes: [],
    }));

    return [...data.data, ...plans];
  }, [data.data, plansPending]);

  console.log({ dataWithPending });

  const planAdd = useCallback(
    (planNew: {
      startLat: number;
      startLon: number;
      finishLat: number | null;
      finishLon: number | null;
      distance: number;
      bearing: number | null;
      tripType: "round-trip" | "start-finish";
    }): string => {
      const id = generate();
      const plansPendingUpdated = [
        ...plansPending,
        {
          id,
          name: `from ${planNew.startLat},${planNew.startLon} to ${planNew.finishLat},${planNew.finishLon}`,
          startLat: planNew.startLat,
          startLon: planNew.startLon,
          finishLat: planNew.finishLat,
          finishLon: planNew.finishLon,
          distance: planNew.distance,
          bearing: planNew.bearing,
          tripType: planNew.tripType,
          createdAt: new Date(),
        },
      ];
      console.log({ plansPendingUpdated });
      plansPendingStorage.set(plansPendingUpdated);
      setPlansPending(plansPendingUpdated);
      dataSyncPendingPush()
        .then(() => console.log("Ad hoc push done"))
        .catch((err) => console.error("Ad hoc push error", err));
      return id;
    },
    [plansPending],
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

  return { data: dataWithPending, error, status, planAdd };
}
