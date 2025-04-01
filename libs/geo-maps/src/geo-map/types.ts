import { type MapRef } from "@vis.gl/react-maplibre";
import { type PropsWithChildren } from "react";

export type GeoMapPlanViewProps = {
  start: Coords | null;
  finish: Coords | null;
  bearing: number | null;
  distance: number;
  colorScheme: "light" | "dark";
  mapRef?: (map: MapRef) => void;
};
export type GeoMapRouteViewProps = {
  route: Coords[];
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
