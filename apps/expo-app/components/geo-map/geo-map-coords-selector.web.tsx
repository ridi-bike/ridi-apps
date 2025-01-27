import {
	type LineLayer,
	Layer,
	Map as MapLibre,
	Source,
	type MapRef,
} from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
	CircleDotIcon,
	CircleFadingPlusIcon,
	CirclePauseIcon,
	CirclePlayIcon,
	CircleUserIcon,
} from "lucide-react-native";
import maplibre from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text } from "~/components/ui/text";
import { Button } from "../ui/button";
import { MapMarker } from "./marker";
import type { Coords, GeoMapProps } from "./types";
import type { FeatureCollection } from "geojson";

export default function GeoMap({
	start,
	finish,
	current,
	points,
	initialFindCoords,
	setStart,
	setFinish,
	route,
}: GeoMapProps) {
	const mapRef = useRef<MapRef>(null);
	const [findCoordsCurr, setFindCoordsCurr] = useState<Coords | null>(
		initialFindCoords
			? {
				lat: initialFindCoords.lat,
				lon: initialFindCoords.lon,
			}
			: null,
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: because we only care about coords
	useEffect(() => {
		if (initialFindCoords) {
			setFindCoordsCurr({
				lat: initialFindCoords.lat,
				lon: initialFindCoords.lon,
			});
		}
	}, [initialFindCoords?.lat, initialFindCoords?.lon]);

	const Actions = useCallback(
		(coords: Coords) => {
			return (
				<>
					<Button variant="outline" onPress={() => setStart?.(coords)}>
						<Text>Start</Text>
					</Button>
					<Button variant="outline" onPress={() => setFinish?.(coords)}>
						<Text>End</Text>
					</Button>
				</>
			);
		},
		[setStart, setFinish],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only redraw when lat/lon change
	const mapBounds = useMemo(() => {
		const filterNumbers = (n: unknown) => Number(n) === n;

		const latValues = [
			findCoordsCurr?.lat || initialFindCoords?.lat,
			start?.lat,
			finish?.lat,
			current?.lat,
			...(points || []).map((p) => p.coords.lat),
			...(route || []).map((p) => p.lat),
		].filter(filterNumbers) as number[];

		const lonValues = [
			findCoordsCurr?.lon || initialFindCoords?.lon,
			start?.lon,
			finish?.lon,
			current?.lon,
			...(points || []).map((p) => p.coords.lon),
			...(route || []).map((p) => p.lon),
		].filter(filterNumbers) as number[];

		if (latValues.length && lonValues.length) {
			const minLat = Math.min(...latValues);
			const maxLat = Math.max(...latValues);
			const minLon = Math.min(...lonValues);
			const maxLon = Math.max(...lonValues);
			return [
				minLon - (maxLon - minLon) * 0.2,
				maxLat + (maxLat - minLat) * 0.2,
				maxLon + (maxLon - minLon) * 0.2,
				minLat - (maxLat - minLat) * 0.2,
			] as const;
		}
		return null;
	}, [
		[
			initialFindCoords?.lat,
			initialFindCoords?.lon,
			start?.lat,
			start?.lon,
			finish?.lat,
			finish?.lon,
			current?.lat,
			current?.lon,
			(points || [])
				.map((p) => [p.coords.lat, p.coords.lon].join(","))
				.join(","),
			(route || []).map((p) => [p.lat, p.lon].join(",")),
		].join(","),
	]);

	useEffect(() => {
		if (mapRef.current && mapBounds) {
			mapRef.current.fitBounds(mapBounds);
		}
	}, [mapBounds]);

	const routeLayer = useMemo(() => {
		if (!route) {
			return null;
		}
		const routeLayerId = "route-layer";
		const layerStyle: LineLayer = {
			id: "route-layer",
			type: "line",
			source: routeLayerId,
			paint: {
				"line-color": "#FF0000",
				"line-width": 3,
			},
		};
		const geojson: FeatureCollection = {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: {},
					geometry: {
						type: "LineString",
						coordinates: route.map((routePoint) => [
							routePoint.lon,
							routePoint.lat,
						]),
					},
				},
			],
		};
		return (
			<Source id={routeLayerId} type="geojson" data={geojson}>
				<Layer {...layerStyle} />
			</Source>
		);
	}, [route]);

	return (
		<MapLibre
			ref={mapRef}
			mapLib={maplibre}
			initialViewState={
				mapBounds
					? { bounds: [...mapBounds] }
					: {
						longitude: 0,
						latitude: 0,
						zoom: 0.5,
					}
			}
			style={{ width: 600, height: 400 }}
			mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
			onDrag={(event) => {
				if (initialFindCoords) {
					setFindCoordsCurr({
						lat: event.viewState.latitude,
						lon: event.viewState.longitude,
					});
				}
			}}
		>
			{(points || []).map((point) => (
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
			{routeLayer}
		</MapLibre>
	);
}
