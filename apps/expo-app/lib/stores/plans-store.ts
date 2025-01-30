import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generate } from "xksuid";

import { dataSyncPendingPush } from "../data-sync";
import { plansPendingStorage, plansStorage } from "../storage";
import { supabase, trpcClient } from "../supabase";

export type Plan = Awaited<
  ReturnType<typeof trpcClient.plans.list.query>
>["data"][number];

export type PlanNew = Parameters<
  typeof trpcClient.plans.create.mutate
>[0]["data"];

export function useStorePlans() {
  const [plansPending, setPlansPending] = useState(
    plansPendingStorage.get() || [],
  );

  const { data, error, status, refetch } = useQuery({
    queryKey: ["plans"],
    queryFn: () =>
      trpcClient.plans.list.query({ version: plansStorage.dataVersion }),
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
          fromLat: planNew.fromLat.toString(),
          fromLon: planNew.fromLon.toString(),
          toLat: planNew.toLat.toString(),
          toLon: planNew.toLon.toString(),
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
