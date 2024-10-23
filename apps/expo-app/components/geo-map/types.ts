import type { Observable } from "@legendapp/state";

export type GeoMapProps = {
	from: Coords | null;
	to: Coords | null;
	points: MapPoint[];
	findCoords: FindCoords | null;
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
