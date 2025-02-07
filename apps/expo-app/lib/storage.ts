import { Platform } from "react-native";
import { MMKV } from "react-native-mmkv";
import superjson from "superjson";

import { type Plan, type PlanNew } from "./stores/plans-store";
import { type Route } from "./stores/routes-store";
import { type RulePackNew, type RulePack } from "./stores/rules-store";

const mmkv = new MMKV();
const storageVersion = "sv1";

export class Storage<TData, TVersion extends string> {
  private storage = {} as Record<string, TData>;

  constructor(
    private readonly dataKey: string,
    public readonly dataVersion: TVersion,
  ) {}

  private getKey(): string {
    return `${storageVersion}/${this.dataKey}/${this.dataVersion}`;
  }

  set(data: TData) {
    if (Platform.OS === "web") {
      this.storage[this.getKey()] = data;
    } else {
      mmkv.set(this.getKey(), superjson.stringify(data));
    }
  }

  get(): TData | undefined {
    if (Platform.OS === "web") {
      return this.storage[this.getKey()];
    }
    const stringData = mmkv.getString(this.getKey());
    if (stringData) {
      return superjson.parse(stringData);
    }
  }
}

export const plansStorage = new Storage<Plan[], "v1">("plans", "v1");
export const plansPendingStorage = new Storage<PlanNew[], "v1">(
  "plans-pending",
  "v1",
);

const routeStorages: Record<string, Storage<Route, "v1">> = {};
export function getRouteStorage(routeId: string): Storage<Route, "v1"> {
  if (!routeStorages[routeId]) {
    routeStorages[routeId] = new Storage<Route, "v1">(`route/${routeId}`, "v1");
  }
  return routeStorages[routeId];
}

export const rulePacksStorage = new Storage<RulePack[], "v1">(
  "rule-packs",
  "v1",
);
export const rulePacksPendingStorage = new Storage<RulePackNew[], "v1">(
  "rule-packs-pending",
  "v1",
);
