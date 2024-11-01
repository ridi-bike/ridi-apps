import { useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { ScrollView } from "react-native";
import { useMount } from "@legendapp/state/react";
import { trpcClient } from "~/lib/supabase";

export default function Route() {
	const { routeId } = useLocalSearchParams<{ routeId: string }>();
	useMount(() => {
		trpcClient.routes.get
			.query({ version: "v1", data: { routeId } })
			.then(console.log)
			.catch(console.error);
	});
	return (
		<ScrollView className="flex-col h-full w-full">
			<Text>{`Route ${routeId}`}</Text>
		</ScrollView>
	);
}
