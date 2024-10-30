import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { ObservablePersistMMKV } from "@legendapp/state/persist-plugins/mmkv";
import { supabase, trpcClient } from "./supabase";
import type { AppRouter } from "../../../supabase/functions/trpc/router";
import { synced } from "@legendapp/state/sync";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { generate } from "xksuid";

export const session$ = observable<Session | null>(null);

type Plan = Awaited<ReturnType<AppRouter["plans"]["list"]>>["data"][number];
type PlanNew = {
	from_lat: number;
	from_lon: number;
	to_lat: number;
	to_lon: number;
};
type PlanStore = {
	plans: Plan[];
};

export function plansStoreAdd(newPlan: PlanNew) {
	const plan: Plan = {
		id: generate(),
		name: `${newPlan.from_lat},${newPlan.from_lon} - ${newPlan.to_lat}, ${newPlan.to_lon}`,
		created_at: new Date().toString(),
		status: "new",
		routes: [],
		...newPlan,
	};
	plans$.plans.set((plans) => [...plans, plan]);

	return plan.id;
}

export const plans$ = observable<PlanStore>(
	synced<PlanStore>({
		get: async (params): Promise<PlanStore> => {
			console.log("plans get", params);
			const plansResult = await trpcClient.plans.list.query({ version: "v1" });
			return {
				plans: plansResult.data,
			};
		},
		set: async (params) => {
			if (
				params.changes.some(
					(change) => change.path.length !== 1 || change.path[0] !== "plans",
				)
			) {
				throw new Error("unsupported changes");
			}
			for (const change of params.changes) {
				const newPlan = (change.valueAtPath as Plan[]).find(
					(currPlan) =>
						!(change.prevAtPath as Plan[]).find(
							(prevPlan) => prevPlan.id === currPlan.id,
						),
				);
				console.log("plans set", params);

				if (!newPlan) {
					throw new Error("wut cant be missing");
				}
				const plans = await trpcClient.plans.create.mutate({
					version: "v1",
					data: newPlan,
				});
			}
		},
		subscribe: ({ refresh }) => {
			const plansChannel = supabase.realtime
				.channel("plans")
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
					},
					(_payload) => {
						console.log("changes", { _payload });
						refresh();
					},
				)
				.subscribe();
			const routesChannel = supabase.realtime
				.channel("routes")
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
					},
					(_payload) => {
						console.log("changes", { _payload });
						refresh();
					},
				)
				.subscribe();

			console.log("subscribe to changes", plansChannel.state, routesChannel);
			return () => {
				plansChannel.unsubscribe();
				routesChannel.unsubscribe();
			};
		},
		mode: "merge",
		retry: {
			infinite: true,
		},
		waitFor: session$,
		initial: {
			plans: [],
		},
		persist: {
			retrySync: true,
			name: "plans",
			plugin:
				Platform.OS === "web"
					? ObservablePersistLocalStorage
					: ObservablePersistMMKV,
		},
	}),
);

// const routes$ = observable<Route[]>(synced<Route[]>({
// 	get
// }));
