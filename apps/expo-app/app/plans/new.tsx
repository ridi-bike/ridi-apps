import { Memo, Show, useObservable } from "@legendapp/state/react";
import * as Location from "expo-location";
import { useCallback } from "react";
import { View } from "react-native";
import GeoMap from "~/components/geo-map";
import type { Coords, FindCoords, MapPoint } from "~/components/geo-map/types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { LocationPermsNotGiven } from "~/components/LocationPermsNotGiven";
import { plansStoreAdd } from "~/lib/stores/plans-store";
import { useRouter } from "expo-router";

export default function TrackRequestNew() {
	const router = useRouter();
	const showLocationAlert$ = useObservable(false);
	const startCoords$ = useObservable<null | Coords>(null);
	const finishCoords$ = useObservable<null | Coords>(null);
	const currentCoords$ = useObservable<null | Coords>(null);
	const searchTerm$ = useObservable("");
	const searchPoints$ = useObservable<MapPoint[]>([]);
	const findCoords$ = useObservable<null | FindCoords>(null);
	const findCoordsCurrent$ = useObservable<null | Coords>(null);

	const geoSearch = useCallback(async () => {
		const points: MapPoint[] = [];
		const request = `https://nominatim.openstreetmap.org/search?q=${searchTerm$.get()}&format=json`;
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
		searchPoints$.set(points);
	}, [searchPoints$, searchTerm$]);

	return (
		<View>
			<Show if={showLocationAlert$}>
				<LocationPermsNotGiven
					close={() => {
						showLocationAlert$.set(false);
					}}
				/>
			</Show>
			<View className="flex-col">
				<Text>Show on map:</Text>
				<View className="flex-row">
					<Button
						variant="outline"
						onPress={async () => {
							const { status } =
								await Location.requestForegroundPermissionsAsync();
							if (status !== "granted") {
								showLocationAlert$.set(true);
								return;
							}

							const location = await Location.getCurrentPositionAsync({});

							if (location) {
								currentCoords$.set({
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
								findCoords$.set({
									initialCoords: {
										lat: 0,
										lon: 0,
									},
									onCoordsChange: (coords) => findCoordsCurrent$.set(coords),
								});
								return;
							}

							const location = await Location.getCurrentPositionAsync({});

							if (location) {
								findCoords$.set({
									initialCoords: {
										lat: location.coords.latitude,
										lon: location.coords.longitude,
									},
									onCoordsChange: (coords) => findCoordsCurrent$.set(coords),
								});
							} else {
								findCoords$.set({
									initialCoords: {
										lat: 0,
										lon: 0,
									},
									onCoordsChange: (coords) => findCoordsCurrent$.set(coords),
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
						$value={searchTerm$}
						onChangeText={(t) => searchTerm$.set(t)}
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
						<Memo>
							{() => `${startCoords$.lat.get()}, ${startCoords$.lon.get()}`}
						</Memo>
					</Text>
				</View>
				<View className="flex-row">
					<Text className="font-bold">Finish:</Text>
					<Text>
						<Memo>
							{() => `${finishCoords$.lat.get()}, ${finishCoords$.lon.get()}`}
						</Memo>
					</Text>
				</View>
			</View>
			<View className="flex-row">
				<Button
					variant="outline"
					onPress={() => {
						const start = startCoords$.get();
						const finish = finishCoords$.get();
						if (start && finish) {
							const planId = plansStoreAdd({
								fromLat: start.lat,
								fromLon: start.lon,
								toLat: finish.lat,
								toLon: finish.lon,
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
				<Memo>
					{() => (
						<GeoMap
							start={startCoords$.get()}
							finish={finishCoords$.get()}
							current={currentCoords$.get()}
							points={searchPoints$.get()}
							findCoords={findCoords$.get() as FindCoords}
							setStart={(coords) => startCoords$.set(coords)}
							setFinish={(coords) => finishCoords$.set(coords)}
						/>
					)}
				</Memo>
			</View>
		</View>
	);
}
