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
	const searchTerms$ = useObservable("");
	const searchPoints$ = useObservable<MapPoint[]>([]);
	const findCoords$ = useObservable<null | FindCoords>(null);
	const findCoordsCurrent$ = useObservable<null | Coords>(null);

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
				<Input $value={searchTerms$} nativeID="search-terms" />
				<Button variant="outline">
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
