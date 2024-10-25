import { type Observable, observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { ObservablePersistMMKV } from "@legendapp/state/persist-plugins/mmkv";
import { supabase, trpcClient } from "./supabase";
import type { AppRouter } from "../../../supabase/functions/trpc/router";
import { synced } from "@legendapp/state/sync";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";

export const session$ = observable<{
	initialized: boolean;
	session: Session | null;
}>({
	initialized: false,
	session: null,
});

type TrackRequest = Awaited<
	ReturnType<AppRouter["trackRequests"]["list"]>
>[number];
type Track = Awaited<ReturnType<AppRouter["tracks"]["list"]>>[number];
type Tracks = {
	addTrackRequest: (trackReq: TrackRequest) => void;
	tracks: Track[];
	trackRequests: TrackRequest[];
};

function addTrackRequest(trackReq: TrackRequest) {
	tracks$.trackRequests.set((trs) => [...trs, trackReq]);
}

export const tracks$ = observable<Tracks>(
	synced<Tracks>({
		get: async () => {
			const trackRequests = await trpcClient.trackRequests.list.query();
			const tracks = await trpcClient.tracks.list.query();
			return {
				addTrackRequest,
				tracks,
				trackRequests,
			};
		},
		set: async (params) => {
			if (
				params.changes.some(
					(change) =>
						change.path.length !== 1 || change.path[0] !== "trackRequests",
				)
			) {
				throw new Error("unsupported changes");
			}
			for (const change of params.changes) {
				const newTrackReq = (change.valueAtPath as TrackRequest[]).find(
					(trRq) =>
						!(change.prevAtPath as TrackRequest[]).find(
							(trReqPrev) => trReqPrev.id === trRq.id,
						),
				);

				if (!newTrackReq) {
					throw new Error("wut cant be missing");
				}
				const trackRequest = await trpcClient.trackRequests.create.mutate({
					from_lat: newTrackReq.from_lat,
					from_lon: newTrackReq.from_lon,
					to_lat: newTrackReq.to_lat,
					to_lon: newTrackReq.to_lon,
					name: newTrackReq.name,
					// TODO created at from local or from db??
				});
			}
		},
		subscribe: ({ refresh }) => {
			const channel = supabase.realtime
				.channel("track_requests")
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

			console.log("subscribe to changes", channel.state);
			return () => channel.unsubscribe();
		},
		mode: "merge",
		retry: {
			infinite: true,
		},
		waitFor: session$.initialized,
		initial: {
			addTrackRequest,
			tracks: [],
			trackRequests: [],
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
