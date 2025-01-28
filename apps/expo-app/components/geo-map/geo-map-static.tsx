import * as turf from "@turf/turf";
import { Map as MapLibre } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibre from "maplibre-gl";
import { useMemo } from "react";
import { View } from "react-native";

import { cn } from "~/lib/utils";

import GeoMapMarker from "./geo-map-marker";

type GeoMapStaticProps = {
  points: { icon: React.ReactNode; coords: [number, number] }[];
  className?: string;
};

export function GeoMapStatic(props: GeoMapStaticProps) {
  const bbox = useMemo(() => {
    const features = turf.points(
      props.points.map((p) => [p.coords[1], p.coords[0]]),
    );
    return turf.bbox(features);
  }, [props.points]);

  return (
    <View className={cn("size-full", props.className)}>
      <MapLibre
        mapLib={maplibre}
        initialViewState={{
          bounds: [bbox[0] - 0.1, bbox[1] - 0.1, bbox[2] + 0.1, bbox[3] + 0.1],
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
        interactive={false}
        attributionControl={false}
      >
        {props.points.map((point) => (
          <GeoMapMarker
            key={`${point.coords[0]}-${point.coords[1]}`}
            lat={point.coords[0]}
            lon={point.coords[1]}
          >
            {point.icon}
          </GeoMapMarker>
        ))}
      </MapLibre>
    </View>
  );
}
