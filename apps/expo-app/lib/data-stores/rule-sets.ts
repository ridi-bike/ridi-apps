import { useTable } from "@ridi/store-with-schema/hooks";
import { useMemo } from "react";

import { dataStore } from "./data-store";

export function useRuleSets() {
  const ruleSets = useTable(dataStore, "ruleSets");
  return useMemo(() => Object.values(ruleSets), [ruleSets]);
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
