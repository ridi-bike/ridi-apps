import { observable, type Observable } from "@legendapp/state";
import type { AppRouter } from "../../../../supabase/functions/trpc/router";
import { synced } from "@legendapp/state/sync";
import { session$ } from "./session-store";
import * as R from "remeda";
import { trpcClient } from "../supabase";
import { Platform } from "react-native";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { ObservablePersistMMKV } from "@legendapp/state/persist-plugins/mmkv";

export type Route = Awaited<ReturnType<AppRouter["routes"]["get"]>>["data"];
type Routes = Record<string, Promise<Route>>;
type RoutesStore = {
	getRoute: (routeId: string) => Observable<Promise<Route>>;
	routes: Routes;
	needsRoutes: string[];
};

export const routes$ = observable<RoutesStore>({
	getRoute: (routeId: string): Observable<Promise<Route>> => {
		if (routes$.routes[routeId].get() === undefined) {
			routes$.needsRoutes.set((nr) => [...nr, routeId]);
		}
		return routes$.routes[routeId];
	},
	needsRoutes: [],
	routes: synced<Routes>({
		get: (): Routes => {
			return R.pipe(
				routes$.needsRoutes.get(),
				R.map(
					(routeId) =>
						[
							routeId,
							trpcClient.routes.get
								.query({ version: "v1", data: { routeId } })
								.then((r) => r.data),
						] as [string, Promise<Route>],
				),
				R.mapToObj((routeEntries) => routeEntries),
			);
		},
		mode: "assign",
		retry: {
			infinite: true,
		},
		waitFor: session$,
		initial: {},
		persist: {
			retrySync: true,
			name: "routes",
			plugin:
				Platform.OS === "web"
					? ObservablePersistLocalStorage
					: ObservablePersistMMKV,
		},
	}),
});
