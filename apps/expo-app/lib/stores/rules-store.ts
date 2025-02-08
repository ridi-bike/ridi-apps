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
import {
  ruleSetsPendingStorage,
  ruleSetsStorage,
  ruleSetsDeletedStore,
} from "../storage";
import { supabase } from "../supabase";

import { getSuccessResponseOrThrow } from "./util";

export type RuleSet = RuleSetsListResponse["data"][number];
export type RuleSetNew = RuleSetsSetRequest["data"];

export function useStoreRuleSets() {
  const [ruleSetsPending, setRuleSetsPending] = useState(
    ruleSetsPendingStorage.get() || [],
  );

  const [ruleSetDeleted, setRuleSetDelted] = useState(
    ruleSetsDeletedStore.get() || [],
  );

  const refresh = useCallback(() => {
    setRuleSetsPending(ruleSetsPendingStorage.get() || []);
    setRuleSetDelted(ruleSetsDeletedStore.get() || []);
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
    const ruleSets: RuleSet[] = ruleSetsPending
      .filter((rs) => ruleSetDeleted.includes(rs.id))
      .map((p) => ({
        ...p,
        isSystem: false,
      }));

    return [
      ...data.data.filter(
        (existingData) =>
          !ruleSets.find((pendingData) => pendingData.id === existingData.id) ||
          ruleSetDeleted.includes(existingData.id),
      ),
      ...ruleSets,
    ];
  }, [data.data, ruleSetDeleted, ruleSetsPending]);

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

  const ruleSetDelete = useCallback(
    (id: string) => {
      setRuleSetDelted([...ruleSetDeleted, id]);
      ruleSetsDeletedStore.set([...ruleSetDeleted, id]);
      dataSyncPendingPush()
        .then(() => console.log("Ad hoc push done"))
        .catch((err) => console.error("Ad hoc push error", err));
    },
    [ruleSetDeleted],
  );

  useEffect(() => {
    const plansSub = supabase
      .channel(`rule_sets_${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rule_sets" },
        (_payload) => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      plansSub.unsubscribe();
    };
  }, [refetch]);

  return {
    data: dataWithPending,
    error,
    status,
    ruleSetSet,
    ruleSetDelete,
  };
}
