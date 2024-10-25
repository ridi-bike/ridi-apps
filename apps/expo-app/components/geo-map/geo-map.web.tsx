import { Map as MapLibre, type MapRef, Marker } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
	MapPinCheckIcon,
	MapPinHouseIcon,
	MapPinIcon,
} from "lucide-react-native";
import maplibre from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { Coords, GeoMapProps } from "./types";

export default function GeoMap({ from, to, points, findCoords }: GeoMapProps) {
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: only redraw when lat/lon change
	useEffect(() => {
		if (mapRef.current) {
			const filterNumbers = (n: unknown) => Number(n) === n;

			const latValues = [
				findCoords?.initialCoords.lat,
				findCoordsCurr?.lat,
				from?.lat,
				to?.lat,
				...points.map((p) => p.coords.lat),
			].filter(filterNumbers) as number[];

			const lonValues = [
				findCoords?.initialCoords.lon,
				findCoordsCurr?.lon,
				from?.lon,
				to?.lon,
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
			from?.lat,
			from?.lon,
			to?.lat,
			to?.lon,
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
				<Marker
					key={`${point.coords.lat},${point.coords.lon}`}
					latitude={point.coords.lat}
					longitude={point.coords.lon}
				>
					<MapPinIcon className="text-blue-300" />
				</Marker>
			))}
			{from && (
				<Marker latitude={from.lat} longitude={from.lon}>
					<MapPinHouseIcon className="text-green-300" />
				</Marker>
			)}
			{to && (
				<Marker latitude={to.lat} longitude={to.lon}>
					<MapPinCheckIcon className="text-red-300" />
				</Marker>
			)}
			{findCoordsCurr && (
				<Marker latitude={findCoordsCurr.lat} longitude={findCoordsCurr.lon}>
					<MapPinIcon className="text-yellow-300" />
				</Marker>
			)}
		</MapLibre>
	);
}
