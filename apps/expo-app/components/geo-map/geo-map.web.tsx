import { Map as MapLibre, Marker } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibre from "maplibre-gl";
import type { GeoMapProps } from "./types";
import {
	For,
	Memo,
	Show,
	useObservable,
	useObserve,
} from "@legendapp/state/react";
import {
	CircleIcon,
	MapPinCheckIcon,
	MapPinHouseIcon,
	MapPinIcon,
} from "lucide-react-native";

export default function GeoMap(props: GeoMapProps) {
	console.log({ props });
	const findCoords$ = useObservable({
		lat: props.findCoords.peek()?.initialCoords.lat,
		lon: props.findCoords.peek()?.initialCoords.lon,
	});

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
				if (props.findCoords.peek()) {
					props.findCoords.onCoordsChange({
						lat: event.viewState.latitude,
						lon: event.viewState.longitude,
					});
				}
			}}
		>
			<For each={props.points}>
				{(point) => (
					<Marker
						latitude={point.coords.lat.get()}
						longitude={point.coords.lon.get()}
					>
						<MapPinIcon className="text-blue-300" />
					</Marker>
				)}
			</For>
			<Show if={props.from.get()}>
				<Marker
					latitude={props.from.get()?.lat}
					longitude={props.from.get()?.lon}
				>
					<MapPinHouseIcon className="text-green-300" />
				</Marker>
			</Show>
			<Show if={props.to.get()}>
				<Marker latitude={props.to.get()?.lat} longitude={props.to.get()?.lon}>
					<MapPinCheckIcon className="text-red-300" />
				</Marker>
			</Show>
			<Show if={props.findCoords.get()}>
				<Marker
					latitude={findCoords$.lat.get()}
					longitude={findCoords$.lon.get()}
				>
					<MapPinIcon className="text-yellow-300" />
				</Marker>
			</Show>
		</MapLibre>
	);
}
