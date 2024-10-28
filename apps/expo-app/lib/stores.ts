import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { ObservablePersistMMKV } from "@legendapp/state/persist-plugins/mmkv";
import { supabase, trpcClient } from "./supabase";
import type { AppRouter } from "../../../supabase/functions/trpc/router";
import { synced } from "@legendapp/state/sync";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { generate } from "xksuid";

export const session$ = observable<{
	initialized: boolean;
	session: Session | null;
}>({
	initialized: false,
	session: null,
});

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

export function addPlan(newPlan: PlanNew) {
	const plan: Plan = {
		id: generate(),
		name: `${newPlan.from_lat},${newPlan.from_lon} - ${newPlan.to_lat}, ${newPlan.to_lon}`,
		created_at: new Date().toString(),
		routes: [],
		...newPlan,
	};
	plans$.plans.set((plans) => [...plans, plan]);

	return plan.id;
}

export const plans$ = observable<PlanStore>(
	synced<PlanStore>({
		get: async ({ value }) => {
			console.log("get value", value);
			const plans = await trpcClient.plans.list.query({ version: "v1" });
			return {
				plans,
			};
		},
		set: async (params) => {
			// if (
			// 	params.changes.some(
			// 		(change) =>
			// 			change.path.length !== 1 || change.path[0] !== "trackRequests",
			// 	)
			// ) {
			// 	throw new Error("unsupported changes");
			// }
			// for (const change of params.changes) {
			// 	const newPlan = (change.valueAtPath as TrackRequest[]).find(
			// 		(trRq) =>
			// 			!(change.prevAtPath as TrackRequest[]).find(
			// 				(trReqPrev) => trReqPrev.id === trRq.id,
			// 			),
			// 	);
			console.log(params);
			const newPlan = {};

			if (!newPlan) {
				throw new Error("wut cant be missing");
			}
			const plans = await trpcClient.plans.create.mutate({
				...newPlan,
			});
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
		waitFor: session$.initialized,
		initial: {
			plans: [],
		},
		persist: {
			name: "tracks",
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
