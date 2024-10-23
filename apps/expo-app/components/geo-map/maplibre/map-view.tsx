import MapLibreGL from "@maplibre/maplibre-react-native";
import { remapProps } from "nativewind";

MapLibreGL.setAccessToken(null);

// const { MapView } = MapLibreGL;

const MapView = remapProps(MapLibreGL.MapView, {
	className: "style",
});

export { MapView };
