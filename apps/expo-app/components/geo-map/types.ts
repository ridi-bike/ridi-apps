import type { Observable } from "@legendapp/state";
import type { PropsWithChildren } from "react";

export type GeoMapProps = {
	start: Coords | null;
	finish: Coords | null;
	current: Coords | null;
	points: MapPoint[];
	findCoords: FindCoords | null;
	setStart: (coords: Coords) => void;
	setFinish: (cords: Coords) => void;
};

export type FindCoords = {
	initialCoords: Coords;
	onCoordsChange: (coords: Coords) => void;
};

export type Coords = {
	lat: number;
	lon: number;
};

export type MapPoint = {
	title: string;
	description: string;
	coords: Coords;
};

export type GeoMapMarkerProps = PropsWithChildren<{
	lat: number;
	lon: number;
}>;
