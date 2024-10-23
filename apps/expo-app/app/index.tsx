import { Text, View } from "react-native";
import { Memo, Show, useMount, useObservable } from "@legendapp/state/react";
import Auth from "~/components/Auth";
import { supabase } from "~/lib/supabase";
import { TrackRequestsList } from "~/components/TrackRequestsList";
import { session$ } from "~/lib/stores";
import GeoMap from "~/components/geo-map";
import { Link } from "@react-navigation/native";

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

	const coords$ = useObservable({
		set: false,
		coords: {
			lat: 0,
			lon: 0,
		},
	});

	return (
		<View className="flex-1 h-full w-full">
			<View className="h-24 w-full justify-between flex-row">
				<Show if={session$.initialized}>
					<Text>
						<Memo>{session$.session.user.id}</Memo>
					</Text>
				</Show>
				<Auth />
			</View>
			<Link to={"/track-request/new"}>new new new</Link>
			<Text>
				<Memo>
					{() => `${coords$.coords.lat.get()}, ${coords$.coords.lon.get()}`}
				</Memo>
			</Text>
			<Show if={session$.initialized}>
				<TrackRequestsList />
			</Show>
		</View>
	);
}
