import { Map as MapLibre, type MapRef } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
	CircleDotIcon,
	CircleFadingPlusIcon,
	CirclePauseIcon,
	CirclePlayIcon,
	CircleUserIcon,
} from "lucide-react-native";
import maplibre from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text } from "~/components/ui/text";
import { Button } from "../ui/button";
import { MapMarker } from "./marker";
import type { Coords, GeoMapProps } from "./types";

export default function GeoMap({
	start,
	finish,
	current,
	points,
	findCoords,
	setStart,
	setFinish,
}: GeoMapProps) {
	const mapRef = useRef<MapRef>(null);
	const [findCoordsCurr, setFindCoordsCurr] = useState<Coords | null>(
		findCoords
			? {
				lat: findCoords.initialCoords.lat,
				lon: findCoords.initialCoords.lon,
			}
			: null,
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: because we only care about coords
	useEffect(() => {
		if (findCoords) {
			setFindCoordsCurr({
				lat: findCoords.initialCoords.lat,
				lon: findCoords.initialCoords.lon,
			});
		}
	}, [findCoords?.initialCoords.lat, findCoords?.initialCoords.lon]);

	const Actions = useCallback(
		(coords: Coords) => {
			return (
				<>
					<Button variant="outline" onPress={() => setStart(coords)}>
						<Text>Start</Text>
					</Button>
					<Button variant="outline" onPress={() => setFinish(coords)}>
						<Text>End</Text>
					</Button>
				</>
			);
		},
		[setStart, setFinish],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only redraw when lat/lon change
	useEffect(() => {
		if (mapRef.current) {
			const filterNumbers = (n: unknown) => Number(n) === n;

			const latValues = [
				findCoordsCurr?.lat || findCoords?.initialCoords.lat,
				start?.lat,
				finish?.lat,
				current?.lat,
				...points.map((p) => p.coords.lat),
			].filter(filterNumbers) as number[];

			const lonValues = [
				findCoordsCurr?.lon || findCoords?.initialCoords.lon,
				start?.lon,
				finish?.lon,
				current?.lon,
				...points.map((p) => p.coords.lon),
			].filter(filterNumbers) as number[];

			if (latValues.length && lonValues.length) {
				const minLat = Math.min(...latValues);
				const maxLat = Math.max(...latValues);
				const minLon = Math.min(...lonValues);
				const maxLon = Math.max(...lonValues);
				mapRef.current.fitBounds([
					[minLon - (maxLon - minLon) * 0.2, maxLat + (maxLat - minLat) * 0.2],
					[maxLon + (maxLon - minLon) * 0.2, minLat - (maxLat - minLat) * 0.2],
				]);
			}
		}
	}, [
		[
			findCoords?.initialCoords.lat,
			findCoords?.initialCoords.lon,
			start?.lat,
			start?.lon,
			finish?.lat,
			finish?.lon,
			current?.lat,
			current?.lon,
			points.map((p) => [p.coords.lat, p.coords.lon].join(",")).join(","),
		].join(","),
	]);

	return (
		<MapLibre
			ref={mapRef}
			mapLib={maplibre}
			initialViewState={{
				longitude: -100,
				latitude: 40,
				zoom: 3.5,
			}}
			style={{ width: 600, height: 400 }}
			mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
			onDrag={(event) => {
				if (findCoords) {
					setFindCoordsCurr({
						lat: event.viewState.latitude,
						lon: event.viewState.longitude,
					});
					findCoords.onCoordsChange({
						lat: event.viewState.latitude,
						lon: event.viewState.longitude,
					});
				}
			}}
		>
			{points.map((point) => (
				<MapMarker
					key={`${point.coords.lat},${point.coords.lon}`}
					lat={point.coords.lat}
					lon={point.coords.lon}
					title={point.title}
					description={point.description}
					actions={<Actions lat={point.coords.lat} lon={point.coords.lon} />}
				>
					<CircleFadingPlusIcon className="h-8 w-8 text-blue-500" />
				</MapMarker>
			))}
			{start && (
				<MapMarker
					lat={start.lat}
					lon={start.lon}
					title="From"
					description={`${start.lat}, ${start.lon}`}
				>
					<CirclePlayIcon className="h-8 w-8 text-green-500" />
				</MapMarker>
			)}
			{finish && (
				<MapMarker
					lat={finish.lat}
					lon={finish.lon}
					title="To"
					description={`${finish.lat}, ${finish.lon}`}
				>
					<CirclePauseIcon className="h-8 w-8 text-red-500" />
				</MapMarker>
			)}
			{current && (
				<MapMarker
					lat={current.lat}
					lon={current.lon}
					title="To"
					description={`${current.lat}, ${current.lon}`}
					actions={<Actions lat={current.lat} lon={current.lon} />}
				>
					<CircleUserIcon className="h-8 w-8 text-teal-500" />
				</MapMarker>
			)}
			{findCoordsCurr && (
				<MapMarker
					lat={findCoordsCurr.lat}
					lon={findCoordsCurr.lon}
					title="To"
					description={`${findCoordsCurr.lat}, ${findCoordsCurr.lon}`}
					actions={
						<Actions lat={findCoordsCurr.lat} lon={findCoordsCurr.lon} />
					}
				>
					<CircleDotIcon className="h-8 w-8 text-yellow-500" />
				</MapMarker>
			)}
		</MapLibre>
	);
}
