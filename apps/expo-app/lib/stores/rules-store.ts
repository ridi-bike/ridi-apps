import {
  type RuleSetsSetRequest,
  type RuleSetsListResponse,
} from "@ridi/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generate } from "xksuid";

import { apiClient } from "../api";
import { dataSyncPendingPush } from "../data-sync";
import { ruleSetsPendingStorage, ruleSetsStorage } from "../storage";
import { supabase } from "../supabase";

import { getSuccessResponseOrThrow } from "./util";

export type RuleSet = RuleSetsListResponse["data"][number];
export type RuleSetNew = RuleSetsSetRequest["data"];

export function useStoreRuleSets() {
  const [ruleSetsPending, setRuleSetsPending] = useState(
    ruleSetsPendingStorage.get() || [],
  );

  const refresh = useCallback(() => {
    setRuleSetsPending(ruleSetsPendingStorage.get() || []);
  }, []);

  useFocusEffect(refresh);

  const { data, error, status, refetch } = useQuery({
    queryKey: ["rule-sets"],
    queryFn: () =>
      apiClient
        .ruleSetsList({ query: { version: ruleSetsStorage.dataVersion } })
        .then((r) => getSuccessResponseOrThrow(200, r)),
    initialData: {
      version: ruleSetsStorage.dataVersion,
      data: ruleSetsStorage.get() || [],
    },
  });

  useEffect(() => {
    if (data) {
      ruleSetsStorage.set(data.data);
    }
  }, [data]);

  const dataWithPending = useMemo((): RuleSet[] => {
    const plans: RuleSet[] = ruleSetsPending.map((p) => ({
      ...p,
      system: false,
    }));

    return [...data.data, ...plans];
  }, [data.data, ruleSetsPending]);

  const ruleSetSet = useCallback(
    (
      ruleSetNewValues: Omit<RuleSetNew, "id"> & { id: string | null },
    ): string => {
      ruleSetNewValues.id = ruleSetNewValues.id || generate();
      const ruleSetsPendingUpdated = [
        ...ruleSetsPending,
        {
          ...ruleSetNewValues,
        } as RuleSetNew,
      ];
      ruleSetsPendingStorage.set(ruleSetsPendingUpdated);
      setRuleSetsPending(ruleSetsPendingUpdated);
      dataSyncPendingPush()
        .then(() => console.log("Ad hoc push done"))
        .catch((err) => console.error("Ad hoc push error", err));
      return ruleSetNewValues.id;
    },
    [ruleSetsPending],
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

  return { data: dataWithPending, error, status, ruleSetSet };
}
