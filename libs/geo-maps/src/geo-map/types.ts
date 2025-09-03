import { type MapRef } from "@vis.gl/react-maplibre";
import { type GeoJSON } from "geojson";
import { type PropsWithChildren } from "react";

export type GeoMapPlanViewProps = {
  initialCoords: [number, number];
  start: Coords | undefined;
  finish: Coords | undefined;
  bearing: number | undefined;
  distance: number;
  colorScheme: "light" | "dark";
  mapRef?: (map: MapRef) => void;
};
export type GeoMapRouteViewProps = {
  routeGeojson: GeoJSON;
  interactive: boolean;
  colorScheme: "light" | "dark";
  mapRef?: (map: MapRef) => void;
};

export type Coords = {
  lat: number;
  lon: number;
  icon?: React.ReactNode;
};

export type GeoMapMarkerProps = PropsWithChildren<{
  lat: number;
  lon: number;
}>;
