import { AnimatePresence } from "@legendapp/motion";
import { Memo, Show, useObservable } from "@legendapp/state/react";
import * as Location from "expo-location";
import { useCallback } from "react";
import { View } from "react-native";
import GeoMap from "~/components/geo-map";
import type { Coords, FindCoords, MapPoint } from "~/components/geo-map/types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Text } from "~/components/ui/text";
import { LocationPermsNotGiven } from "./LocationPermsNotGiven";

export default function TrackRequestNew() {
	const showLocationAlert$ = useObservable(false);
	const fromCoords$ = useObservable<null | Coords>(null);
	const toCoords$ = useObservable<null | Coords>(null);
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
			<Show if={showLocationAlert$} wrap={AnimatePresence}>
				<LocationPermsNotGiven
					close={() => {
						showLocationAlert$.set(false);
					}}
				/>
			</Show>
			<View className="flex-row">
				<Text>From:</Text>
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
							fromCoords$.set({
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
					<Text>From map</Text>
				</Button>
				<Text>
					<Memo>
						{() =>
							fromCoords$.get()
								? `${fromCoords$.lat.get()}, ${fromCoords$.lon.get()}`
								: "None"
						}
					</Memo>
				</Text>
			</View>
			<View className="flex-row">
				<Text>To:</Text>
				<Label nativeID="search-terms">Search</Label>
				<Input
					$value={searchTerm$}
					onChangeText={(t) => searchTerm$.set(t)}
					nativeID="search-terms"
				/>
				<Button variant="outline" onPress={geoSearch}>
					<Text>GO</Text>
				</Button>
			</View>
			<View>
				<Memo>
					{() => (
						<GeoMap
							from={fromCoords$.get()}
							to={toCoords$.get()}
							points={searchPoints$.get()}
							findCoords={findCoords$.get()}
						/>
					)}
				</Memo>
			</View>
		</View>
	);
}
