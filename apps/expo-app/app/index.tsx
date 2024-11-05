import { Text, View } from "react-native";
import { Show } from "@legendapp/state/react";
import Auth from "~/components/Auth";
import { session$ } from "~/lib/stores/session-store";
import { Link } from "expo-router";

export default function Index() {
	console.log("index ");
	return (
		<View className="flex-1 h-full w-full">
			<View className="h-24 w-full justify-between flex-row">
				<Show if={session$}>
					<Text>{session$.user.id.get()}</Text>
				</Show>
				<Auth />
			</View>
			<Link href={"/plans/new"}>new new</Link>
			<Link href={"/plans"}>list plans</Link>
		</View>
	);
}
