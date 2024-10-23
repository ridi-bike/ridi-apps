import { Map as MapLibre } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibre from 'maplibre-gl'

export function MapsMaps() {
	return (
		<MapLibre
			mapLib={maplibre}
			initialViewState={{
				longitude: -100,
				latitude: 40,
				zoom: 3.5,
			}}
			style={{ width: 600, height: 400 }}
			mapStyle="https://demotiles.maplibre.org/style.json"
		/>
	);
}
