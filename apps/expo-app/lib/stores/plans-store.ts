import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generate } from "xksuid";

import { apiClient } from "../api";
import { dataSyncPendingPush } from "../data-sync";
import { plansPendingStorage, plansStorage } from "../storage";
import { supabase } from "../supabase";

type ApiClient = typeof apiClient;

export type Plan = Awaited<
  ReturnType<
    Awaited<
      ReturnType<ApiClient["user"]["plans"]["all"]["v"][":version"]["$get"]>
    >["json"]
  >
>["data"][number];

export type PlanNew = Parameters<
  ApiClient["user"]["plans"]["create"]["$post"]
>[0]["json"]["data"];

export function useStorePlans() {
  const [plansPending, setPlansPending] = useState(
    plansPendingStorage.get() || [],
  );

  const { data, error, status, refetch } = useQuery({
    queryKey: ["plans"],
    queryFn: () =>
      apiClient.user.plans.all.v[":version"]
        .$get({
          param: {
            version: plansStorage.dataVersion,
          },
        })
        .then((r) => r.json()),
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
      createdAt: p.createdAt.toString(),
      routes: [],
    }));

    return [...data.data, ...plans];
  }, [data.data, plansPending]);

  const planAdd = useCallback(
    (planNew: {
      fromLat: number;
      fromLon: number;
      toLat: number;
      toLon: number;
    }): string => {
      const id = generate();
      const plansPendingUpdated = [
        ...plansPending,
        {
          id,
          name: `from ${planNew.fromLat},${planNew.fromLon} to ${planNew.toLat},${planNew.toLon}`,
          fromLat: planNew.fromLat,
          fromLon: planNew.fromLon,
          toLat: planNew.toLat,
          toLon: planNew.toLon,
          createdAt: new Date(),
        },
      ];
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
    console.log("use effect refetch", refetch);
    const plansSub = supabase
      .channel(`plans_routes_${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plans" },
        (_payload) => {
          console.log("plans sub received", _payload);
          refetch();
        },
      )
      .subscribe();

    console.log("subscribed to plans", plansSub.state);
    return () => {
      console.log("unsubed from plans");
      plansSub.unsubscribe();
    };
  }, [refetch]);

  return { data: dataWithPending, error, status, planAdd };
}
