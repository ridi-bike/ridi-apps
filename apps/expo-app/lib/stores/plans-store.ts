import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { ObservablePersistMMKV } from "@legendapp/state/persist-plugins/mmkv";
import { supabase, trpcClient } from "../supabase";
import type { AppRouter } from "../../../../supabase/functions/trpc/router";
import { synced } from "@legendapp/state/sync";
import { Platform } from "react-native";
import { generate } from "xksuid";

type Plan = Awaited<ReturnType<AppRouter["plans"]["list"]>>["data"][number];
type PlanNew = {
	fromLat: number;
	fromLon: number;
	toLat: number;
	toLon: number;
};
type PlansStore = {
	plans: Plan[];
};

export function plansStoreAdd(newPlan: PlanNew) {
	const plan: Plan = {
		id: generate(),
		name: `${newPlan.fromLat},${newPlan.fromLon} - ${newPlan.toLat}, ${newPlan.toLon}`,
		createdAt: new Date(),
		state: "new",
		routes: [],
		fromLat: newPlan.fromLat.toString(),
		fromLon: newPlan.fromLon.toString(),
		toLat: newPlan.toLat.toString(),
		toLon: newPlan.toLon.toString(),
	};
	plans$.plans.set((plans) => [...plans, plan]);

	return plan.id;
}

export const plans$ = observable<PlansStore>(
	synced<PlansStore>({
		get: async (params): Promise<PlansStore> => {
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
				.channel("plans_routes")
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "plans",
					},
					(_payload) => {
						console.log("changes", { _payload });
						refresh();
					},
				)
				.subscribe();
			const routesChannel = supabase.realtime
				.channel("plans_routes")
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "routes",
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
