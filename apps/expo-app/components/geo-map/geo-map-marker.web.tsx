import { Marker } from "@vis.gl/react-maplibre";

import  { type GeoMapMarkerProps } from "./types";

export default function GeoMapMarker({
	lat,
	lon,
	children,
}: GeoMapMarkerProps) {
	return (
		<Marker latitude={lat} longitude={lon}>
			{children}
		</Marker>
	);
}
