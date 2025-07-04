import { ruleSetTags } from "@ridi/store-with-schema";
import { useTable, useRow } from "@ridi/store-with-schema/hooks";
import { useMemo, useCallback } from "react";
import { generate } from "xksuid";

import { dataStore } from "./data-store";

export function useRuleSets() {
  const ruleSets = useTable(dataStore, "ruleSets");
  return useMemo(() => Object.values(ruleSets), [ruleSets]);
}

export function useRuleSet(ruleSetId: unknown) {
  return useRow(
    dataStore,
    "ruleSets",
    typeof ruleSetId === "string" ? ruleSetId : "",
  );
}

export function useRuleSetDefaultId() {
  const ruleSets = useRuleSets();
  return useMemo(() => {
    const ruleSetArr = Object.values(ruleSets);
    return (
      ruleSetArr.find((rp) => !rp.isSystem)?.id ||
      ruleSetArr.find((rp) => rp.isDefault)?.id ||
      ruleSetArr[0]?.id ||
      null
    );
  }, [ruleSets]);
}

export function useRuleSetsUpdate() {
  const ruleSetCreate = useCallback(() => {
    const newRuleSetId = generate();
    dataStore.setRow("ruleSets", newRuleSetId, {
      id: newRuleSetId,
      name: "New rule set",
      icon: null,
      isDeleted: false,
      isSystem: false,
      isDefault: false,
    });
    for (const tag of ruleSetTags) {
      const newTagId = generate();
      dataStore.setRow("ruleSetRoadTags", newTagId, {
        id: newTagId,
        ruleSetId: newRuleSetId,
        tag,
        value: 0,
      });
    }
  }, []);

  const ruleSetDuplicate = useCallback((ruleSetId: string) => {
    const ruleSet = dataStore.getRow("ruleSets", ruleSetId);
    if (!ruleSet || ruleSet.isDeleted) {
      return;
    }
    const newRuleSetId = generate();
    dataStore.setRow("ruleSets", newRuleSetId, {
      ...ruleSet,
      id: newRuleSetId,
      name: `Copy of ${ruleSet.name}`,
    });
    const ruleSetTags = Object.values(
      dataStore.getTable("ruleSetRoadTags"),
    ).filter((t) => t.ruleSetId === ruleSetId);
    for (const ruleSetTag of ruleSetTags) {
      const newTagId = generate();
      dataStore.setRow("ruleSetRoadTags", newTagId, {
        ...ruleSetTag,
        id: newTagId,
        ruleSetId: newRuleSetId,
      });
    }
  }, []);

  const ruleSetDelete = useCallback((ruleSetId: string) => {
    dataStore.setCell("ruleSets", ruleSetId, "isDeleted", true);
  }, []);

  const ruleSetSetName = useCallback((ruleSetId: string, name: string) => {
    dataStore.setCell("ruleSets", ruleSetId, "name", name);
  }, []);

  return {
    ruleSetCreate,
    ruleSetDuplicate,
    ruleSetDelete,
    ruleSetSetName,
  };
}
