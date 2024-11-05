import { use } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { ScrollView } from "react-native";
import { useSelector } from "@legendapp/state/react";
import { routes$, type Route } from "~/lib/stores/routes-store";
import { when } from "@legendapp/state";
import { View } from "lucide-react-native";
import { Suspense } from "react";

export default function RoutePage() {
	const { routeId } = useLocalSearchParams<{ routeId: string }>();
	return (
		<ScrollView className="flex-col h-full w-full">
			<Text>{`Route ${routeId}`}</Text>
			<Suspense fallback={<Text>Loading...</Text>}>
				<PosList routeId={routeId} />
			</Suspense>
		</ScrollView>
	);
}

export function PosList({ routeId }: { routeId: string }) {
	const routeInFlight = useSelector(routes$.getRoute.get(routeId));
	const route = use(routeInFlight);
	return (
		<View>
			{route.points.map((p) => (
				<Text key={p.pointSequence}>
					{p.pointLat}, {p.pointLon}
				</Text>
			))}
		</View>
	);
}
