import { PointSelectDialog } from "../point-select-dialog";

import GeoMapMarker from "./geo-map-marker";
import { type GeoMapMarkerProps } from "./types";

export function MapMarker(
  props: GeoMapMarkerProps & {
    title: string;
    description: string;
    setStart?: () => void;
    setFinish?: () => void;
    unset?: () => void;
  },
) {
  return (
    <GeoMapMarker lat={props.lat} lon={props.lon}>
      <PointSelectDialog {...props} />
    </GeoMapMarker>
  );
}
