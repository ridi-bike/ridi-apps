import { useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { ScrollView } from "react-native";
import { useStoreRoute } from "~/lib/stores/routes-store";
import GeoMap from "~/components/geo-map";

export default function RoutePage() {
	const { routeId } = useLocalSearchParams<{ routeId: string }>();
	const { data, error, status } = useStoreRoute(routeId);
	return (
		<ScrollView className="flex-col h-full w-full">
			<Text>{`Route ${routeId}`}</Text>
			<Text>{status}</Text>
			<Text>{error?.message}</Text>
			<GeoMap
				route={data?.data.points
					.sort((a, b) => Number(a.pointSequence) - Number(b.pointSequence))
					.map((p) => ({ lat: Number(p.pointLat), lon: Number(p.pointLon) }))}
			/>
			{data?.data.points.map((p) => (
				<Text key={p.pointSequence}>
					{p.pointLat}, {p.pointLon}
				</Text>
			))}
		</ScrollView>
	);
}
