import { Text, View } from "react-native";
import { useStore } from "@nanostores/react";
import Auth from "~/components/Auth";
import { $session } from "~/lib/stores/session-store";
import { Link } from "expo-router";

export default function Index() {
	const session = useStore($session);
	console.log("index ", { session });
	return (
		<View className="flex-1 h-full w-full">
			<View className="h-24 w-full justify-between flex-row">
				{session && <Text>{session.user.id}</Text>}
				<Auth />
			</View>
			<Link href={"/plans/new"}>new new</Link>
			<Link href={"/plans"}>list plans</Link>
		</View>
	);
}
