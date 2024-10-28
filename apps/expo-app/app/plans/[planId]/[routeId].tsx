import { useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { ScrollView } from "react-native";

export default function Route() {
	const { routeId } = useLocalSearchParams<{ routeId: string }>();
	return (
		<ScrollView className="flex-col h-full w-full">
			<Text>{`Route ${routeId}`}</Text>
		</ScrollView>
	);
}
