import {
  type RulePacksSetRequest,
  type RulePacksListResponse,
} from "@ridi/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generate } from "xksuid";

import { apiClient } from "../api";
import { dataSyncPendingPush } from "../data-sync";
import { rulePacksPendingStorage, rulePacksStorage } from "../storage";
import { supabase } from "../supabase";

import { getSuccessResponseOrThrow } from "./util";

export type RulePack = RulePacksListResponse["data"][number];
export type RulePackNew = RulePacksSetRequest["data"];

export function useStoreRulePacks() {
  const [rulePacksPending, setRulePacksPending] = useState(
    rulePacksPendingStorage.get() || [],
  );

  const refresh = useCallback(() => {
    setRulePacksPending(rulePacksPendingStorage.get() || []);
  }, []);

  useFocusEffect(refresh);

  const { data, error, status, refetch } = useQuery({
    queryKey: ["rule-packs"],
    queryFn: () =>
      apiClient
        .rulePacksList({ query: { version: rulePacksStorage.dataVersion } })
        .then((r) => getSuccessResponseOrThrow(200, r)),
    initialData: {
      version: rulePacksStorage.dataVersion,
      data: rulePacksStorage.get() || [],
    },
  });

  useEffect(() => {
    if (data) {
      rulePacksStorage.set(data.data);
    }
  }, [data]);

  const dataWithPending = useMemo((): RulePack[] => {
    const plans: RulePack[] = rulePacksPending.map((p) => ({
      ...p,
      system: false,
    }));

    return [...data.data, ...plans];
  }, [data.data, rulePacksPending]);

  const rulePackSet = useCallback(
    (
      rulePackNewValues: Omit<RulePackNew, "id"> & { id: string | null },
    ): string => {
      rulePackNewValues.id = rulePackNewValues.id || generate();
      const rulePacksPendingUpdated = [
        ...rulePacksPending,
        {
          ...rulePackNewValues,
        } as RulePackNew,
      ];
      rulePacksPendingStorage.set(rulePacksPendingUpdated);
      setRulePacksPending(rulePacksPendingUpdated);
      dataSyncPendingPush()
        .then(() => console.log("Ad hoc push done"))
        .catch((err) => console.error("Ad hoc push error", err));
      return rulePackNewValues.id;
    },
    [rulePacksPending],
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

  return { data: dataWithPending, error, status, rulePackSet };
}
