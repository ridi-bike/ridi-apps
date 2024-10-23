import { Map as MapLibre, Marker } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibre from "maplibre-gl";
import type { Coords, GeoMapProps } from "./types";
import {
	MapPinCheckIcon,
	MapPinHouseIcon,
	MapPinIcon,
} from "lucide-react-native";
import { useEffect, useState } from "react";

export default function GeoMap({ from, to, points, findCoords }: GeoMapProps) {
	const [findCoordsCurr, setFindCoordsCurr] = useState<Coords>({
		lat: findCoords?.initialCoords.lat || 0,
		lon: findCoords?.initialCoords.lon || 0,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: because we only care about coords
	useEffect(() => {
		if (findCoords) {
			setFindCoordsCurr({
				lat: findCoords.initialCoords.lat,
				lon: findCoords.initialCoords.lon,
			});
		}
	}, [findCoords?.initialCoords.lat, findCoords?.initialCoords.lon]);

	return (
		<MapLibre
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
			{findCoords && (
				<Marker latitude={findCoordsCurr.lat} longitude={findCoordsCurr.lon}>
					<MapPinIcon className="text-yellow-300" />
				</Marker>
			)}
		</MapLibre>
	);
}
