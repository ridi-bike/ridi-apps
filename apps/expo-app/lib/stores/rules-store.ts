import {
  type RuleSetsSetRequest,
  type RuleSetsListResponse,
} from "@ridi/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { generate } from "xksuid";

import { apiClient } from "../api";
import { supabase } from "../supabase";

import { getSuccessResponseOrThrow } from "./util";

const DATA_VERSION = "v1";

export type RuleSet = RuleSetsListResponse["data"][number];
export type RuleSetNew = RuleSetsSetRequest["data"];

export const RULE_SETS_QUERY_KEY = ["rule-sets", DATA_VERSION];

export function useStoreRuleSets() {
  const queryClient = useQueryClient();

  const { data, error, status, refetch } = useQuery({
    queryKey: RULE_SETS_QUERY_KEY,
    queryFn: () =>
      apiClient
        .ruleSetsList({ query: { version: DATA_VERSION } })
        .then((r) => getSuccessResponseOrThrow(200, r).data),
  });

  const { mutate: mutateSet, isPending: setIsPending } = useMutation({
    mutationFn: (ruleSet: RuleSet) =>
      apiClient
        .ruleSetSet({
          body: {
            version: DATA_VERSION,
            data: ruleSet,
          },
        })
        .then((r) => getSuccessResponseOrThrow(201, r).data),
    onMutate: () => {
      queryClient.invalidateQueries({ queryKey: RULE_SETS_QUERY_KEY });
    },
  });

  const { mutate: mutateDelete, isPending: deleteIsPending } = useMutation({
    mutationFn: (id: string) =>
      apiClient
        .ruleSetDelete({ body: { id } })
        .then((r) => getSuccessResponseOrThrow(204, r)),
    onMutate: () => {
      queryClient.invalidateQueries({ queryKey: RULE_SETS_QUERY_KEY });
    },
  });

  const ruleSetSet = useCallback(
    (
      ruleSetNewValues: Omit<RuleSetNew, "id"> & { id: string | null },
    ): string => {
      const id = ruleSetNewValues.id || generate();
      mutateSet({
        ...ruleSetNewValues,
        icon: null,
        isSystem: false,
        isDefault: false,
        id,
      });
      return id;
    },
    [mutateSet],
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
    data,
    error,
    status,
    ruleSetSet,
    ruleSetSetIsPending: setIsPending,
    ruleSetDelete: mutateDelete,
    ruleSetDeleteIsPending: deleteIsPending,
    refetch,
  };
}
