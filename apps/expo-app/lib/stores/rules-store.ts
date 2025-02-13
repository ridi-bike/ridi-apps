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

type SyncStatus = {
  isSyncPending: boolean;
  isDeleted?: true;
};

export function useStoreRuleSets() {
  const queryClient = useQueryClient();

  const updateLocalRuleSetsPending = useCallback(
    (id: string, ruleSetIn: RuleSet | null, isDeleted?: true) => {
      queryClient.setQueryData<(RuleSet & SyncStatus)[]>(
        [DATA_VERSION, "rule-sets"],
        (ruleSetList) => {
          if (ruleSetList?.some((ruleSet) => ruleSet.id === id)) {
            return ruleSetList.map((ruleSet) => {
              if (ruleSet.id === id) {
                return {
                  ...(ruleSetIn || ruleSet),
                  isSyncPending: true,
                  isDeleted,
                };
              }
              return ruleSet;
            });
          }
          return ruleSetList;
        },
      );
    },
    [queryClient],
  );

  const updateLocalRuleSetsSynced = useCallback(
    (id: string, isDeleted?: true) => {
      queryClient.setQueryData<(RuleSet & SyncStatus)[]>(
        [DATA_VERSION, "rule-sets"],
        (ruleSetList) => {
          if (ruleSetList?.some((ruleSet) => ruleSet.id === id)) {
            if (isDeleted) {
              return ruleSetList.filter((ruleSet) => ruleSet.id !== id);
            }
            return ruleSetList.map((ruleSet) => {
              if (ruleSet.id === id) {
                return { ...ruleSet, isSyncPending: false };
              }
              return ruleSet;
            });
          }
          return ruleSetList;
        },
      );
    },
    [queryClient],
  );

  const { data, error, status, refetch } = useQuery({
    queryKey: ["rule-sets"],
    queryFn: () =>
      apiClient
        .ruleSetsList({ query: { version: DATA_VERSION } })
        .then((r) => getSuccessResponseOrThrow(200, r).data),
  });

  const { mutate: mutateSet } = useMutation({
    mutationKey: ["rule-sets"],
    mutationFn: (ruleSet: RuleSet) =>
      apiClient
        .ruleSetSet({
          body: {
            version: DATA_VERSION,
            data: ruleSet,
          },
        })
        .then((r) => getSuccessResponseOrThrow(201, r).data),
    onMutate: async (ruleSet: RuleSet) => {
      await queryClient.cancelQueries({
        queryKey: [DATA_VERSION, "plans"],
      });
      updateLocalRuleSetsPending(ruleSet.id, ruleSet);
    },
    onSuccess(data) {
      updateLocalRuleSetsSynced(data.id);
    },
  });

  const { mutate: mutateDelete } = useMutation({
    mutationKey: ["rule-sets"],
    mutationFn: (id: string) =>
      apiClient
        .ruleSetDelete({ body: { id } })
        .then((r) => getSuccessResponseOrThrow(204, r)),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: [DATA_VERSION, "plans"],
      });
      updateLocalRuleSetsPending(id, null, true);
    },
    onSuccess(data) {
      updateLocalRuleSetsSynced(data.id, true);
    },
  });

  const ruleSetSet = useCallback(
    (
      ruleSetNewValues: Omit<RuleSetNew, "id"> & { id: string | null },
    ): string => {
      const id = ruleSetNewValues.id || generate();
      mutateSet({
        ...ruleSetNewValues,
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
    ruleSetDelete: mutateDelete,
    refetch,
  };
}
