import { useCallback, useEffect, useState } from "react";

import { coordsAddressGet } from "~/lib/coords-details";

import { PointSelectDialog } from "../point-select-dialog";

import GeoMapMarker from "./geo-map-marker";
import { type GeoMapMarkerProps } from "./types";

export function MapMarker(
  props: GeoMapMarkerProps & {
    title: string;
    setStart?: () => void;
    setFinish?: () => void;
    unset?: () => void;
    onCancel?: () => void;
    isDialogOpen?: boolean;
  },
) {
  const [description, setDescription] = useState("");

  const lookupAddr = useCallback(async () => {
    return await coordsAddressGet({
      lat: props.lat,
      lon: props.lon,
    });
  }, [props.lat, props.lon]);

  useEffect(() => {
    lookupAddr().then((addr) => setDescription(addr));
  }, [lookupAddr, props.lat, props.lon]);

  return (
    <GeoMapMarker lat={props.lat} lon={props.lon}>
      <PointSelectDialog {...props} description={description} />
    </GeoMapMarker>
  );
}
