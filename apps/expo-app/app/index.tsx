import { Text, View } from "react-native";
import {
	Memo,
	Show,
	observer,
	useMount,
	useObservable,
} from "@legendapp/state/react";
import Auth from "~/components/Auth";
import { useEffect, useState } from "react";
import { supabase, supabaseTrpcClient, trpc } from "~/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { Button } from "~/components/ui/button";
import { TrackRequestsList } from "~/components/TrackRequestsList";
import { session$ } from "~/lib/stores";
import { MapsMaps } from "~/components/Map";

export default function Index() {
	useMount(() => {
		supabase.auth.getSession().then(({ data: { session } }) =>
			session$.set({
				initialized: true,
				session,
			}),
		);
		supabase.auth.onAuthStateChange((_event, session) =>
			session$.session.set(session),
		);
	});

	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<Auth />
			<MapsMaps />
			<Show if={session$.initialized}>
				<>
					<Text>
						<Memo>{session$.session.user.id}</Memo>
					</Text>
					<TrackRequestsList />
				</>
			</Show>
		</View>
	);
}
