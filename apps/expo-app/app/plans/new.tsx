import * as Location from "expo-location";
import { useCallback, useState } from "react";
import { View } from "react-native";
import GeoMap from "~/components/geo-map";
import type { Coords, MapPoint } from "~/components/geo-map/types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { LocationPermsNotGiven } from "~/components/LocationPermsNotGiven";
import { useRouter } from "expo-router";
import { useStorePlans } from "~/lib/stores/plans-store";

export default function TrackRequestNew() {
	const router = useRouter();
	const [showLocationAlert, setShowLocationAlert] = useState(false);
	const [startCoords, setStartCoords] = useState<null | Coords>(null);
	const [finishCoords, setFinishCoords] = useState<null | Coords>(null);
	const [currentCoords, setCurrentCoords] = useState<null | Coords>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [searchPoints, setSearchPoints] = useState<MapPoint[]>([]);
	const [initialFindCoords, setInitialFindCoords] = useState<null | Coords>(
		null,
	);

	const { planAdd } = useStorePlans();

	const geoSearch = useCallback(async () => {
		const points: MapPoint[] = [];
		const request = `https://nominatim.openstreetmap.org/search?q=${searchTerm}&format=json`;
		const response = await fetch(request);
		const jsonData = await response.json();
		for (const jsonPoint of jsonData) {
			const point: MapPoint = {
				coords: {
					lat: Number(jsonPoint.lat),
					lon: Number(jsonPoint.lon),
				},
				title: jsonPoint.name,
				description: jsonPoint.display_name,
			};
			points.push(point);
		}
		setSearchPoints(points);
	}, [searchTerm]);

	return (
		<View>
			{showLocationAlert && (
				<LocationPermsNotGiven
					close={() => {
						setShowLocationAlert(false);
					}}
				/>
			)}
			<View className="flex-col">
				<Text>Show on map:</Text>
				<View className="flex-row">
					<Button
						variant="outline"
						onPress={async () => {
							const { status } =
								await Location.requestForegroundPermissionsAsync();
							if (status !== "granted") {
								setShowLocationAlert(true);
								return;
							}

							const location = await Location.getCurrentPositionAsync({});

							if (location) {
								setCurrentCoords({
									lat: location.coords.latitude,
									lon: location.coords.longitude,
								});
							}
						}}
					>
						<Text>Current location</Text>
					</Button>
					<Button
						variant="outline"
						onPress={async () => {
							const { status } =
								await Location.requestForegroundPermissionsAsync();
							if (status !== "granted") {
								setInitialFindCoords({
									lat: 0,
									lon: 0,
								});
								return;
							}

							const location = await Location.getCurrentPositionAsync({});

							if (location) {
								setInitialFindCoords({
									lat: location.coords.latitude,
									lon: location.coords.longitude,
								});
							} else {
								setInitialFindCoords({
									lat: 0,
									lon: 0,
								});
							}
						}}
					>
						<Text>Coords finder</Text>
					</Button>
				</View>
				<View className="flex-row">
					<Input
						placeholder="Search"
						value={searchTerm}
						onChangeText={setSearchTerm}
					/>
					<Button variant="outline" onPress={geoSearch}>
						<Text>GO</Text>
					</Button>
				</View>
			</View>
			<View className="flex-col">
				<View className="flex-row">
					<Text className="font-bold">Start:</Text>
					<Text>
						{startCoords ? `${startCoords.lat}, ${startCoords.lon}` : "None"}
					</Text>
				</View>
				<View className="flex-row">
					<Text className="font-bold">Finish:</Text>
					<Text>
						{finishCoords ? `${finishCoords.lat}, ${finishCoords.lon}` : "None"}
					</Text>
				</View>
			</View>
			<View className="flex-row">
				<Button
					variant="outline"
					onPress={() => {
						if (startCoords && finishCoords) {
							const planId = planAdd({
								fromLat: startCoords.lat,
								fromLon: startCoords.lon,
								toLat: finishCoords.lat,
								toLon: finishCoords.lon,
							});
							router.replace({
								pathname: "/plans/[planId]",
								params: { planId },
							});
						}
					}}
				>
					<Text>Generate routes</Text>
				</Button>
			</View>
			<View>
				<GeoMap
					start={startCoords}
					finish={finishCoords}
					current={currentCoords}
					points={searchPoints}
					initialFindCoords={initialFindCoords}
					setStart={setStartCoords}
					setFinish={setFinishCoords}
				/>
			</View>
		</View>
	);
}
