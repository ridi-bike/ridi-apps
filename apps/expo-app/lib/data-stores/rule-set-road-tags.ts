import { useTable } from "@ridi/store-with-schema/hooks";
import { useCallback, useMemo } from "react";

import { dataStore } from "./data-store.ts";

export function useRuleSetRoadTags(ruleSetId: unknown) {
  const roadTags = useTable(dataStore, "ruleSetRoadTags");
  return useMemo(() => {
    return Object.values(roadTags).filter((t) => t.ruleSetId === ruleSetId);
  }, [roadTags, ruleSetId]);
}

export function useRuleSetRoadTagsUpdate() {
  const roadTagSetValues = useCallback(
    (roadTagValues: { id: string; value?: number | undefined }[]) => {
      roadTagValues.forEach((v) =>
        dataStore.setCell("ruleSetRoadTags", v.id, "value", v.value),
      );
    },
    [],
  );

  return {
    roadTagSetValues,
  };
}
