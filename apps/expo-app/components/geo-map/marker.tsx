import { coordsAddressGet } from "@ridi/maps-api";
import { useCallback, useEffect, useState } from "react";

import { PointSelectDialog } from "../point-select-dialog";

import GeoMapMarker from "./geo-map-marker";
import { type GeoMapMarkerProps } from "./types";

export function MapMarker(
  props: GeoMapMarkerProps & {
    title: string;
    setStart?: () => void;
    setFinish?: () => void;
    unset?: () => void;
    isDialogOpen?: boolean;
  },
) {
  const [description, setDescription] = useState("");

  const lookupAddr = useCallback(async () => {
    return await coordsAddressGet([props.lat.toString(), props.lon.toString()]);
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
