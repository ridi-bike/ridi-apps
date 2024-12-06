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
				route={data?.data.latLonArray.map((p) => ({ lat: p[0], lon: p[1] }))}
			/>
			{data?.data.latLonArray.map((p) => (
				<Text key={p.join(",")}>
					{p[0]}, {p[1]}
				</Text>
			))}
		</ScrollView>
	);
}
