import { GeoMapRouteView, GeoMapPlanView } from "@ridi/geo-maps";
import { mapPreviewSchema } from "@ridi/map-preview-service-contracts";
import { type MapRef } from "@vis.gl/react-maplibre";
import { CirclePlay, CirclePause } from "lucide-react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useMemo, useState } from "react";

const p = new Protocol();
maplibregl.addProtocol("pmtiles", p.tile);

export function MapTest() {
  const [mapRef, setMapRef] = useState<MapRef | null>(null);

  const req = useMemo(() => {
    const searchParams = new URL(window.location.href).searchParams;
    const reqStr = searchParams.get("req");
    if (!reqStr) {
      throw new Error("missing request search param");
    }
    return mapPreviewSchema.parse(JSON.parse(reqStr));
  }, []);

  const colorScheme = useMemo(() => {
    const searchParams = new URL(window.location.href).searchParams;
    const theme = searchParams.get("theme");
    if (theme !== "light" && theme !== "dark") {
      throw new Error("theme wrong value");
    }
    return theme;
  }, []);

  useEffect(() => {
    if (mapRef) {
      const done = () => {
        console.log("RIDI-MAP-RENDERING-DONE");
        mapRef?.getMap().off("idle", done);
      };

      mapRef.getMap().on("idle", done);
    }
  }, [mapRef]);

  return (
    <div id="map-container" style={{ width: "500px", height: "300px" }}>
      {req.type === "plan-start-finish" && (
        <GeoMapPlanView
          colorScheme={colorScheme}
          mapRef={setMapRef}
          start={{
            lat: req.start[0],
            lon: req.start[1],
            icon: (
              <CirclePlay
                style={{ height: "32px", width: "32px", color: "#22c55e" }}
              />
            ),
          }}
          finish={{
            lat: req.finish[0],
            lon: req.finish[1],
            icon: (
              <CirclePause
                style={{ height: "32px", width: "32px", color: "#ef4444" }}
              />
            ),
          }}
          bearing={null}
          distance={0}
        />
      )}
      {req.type === "plan-round-trip" && (
        <GeoMapPlanView
          colorScheme={colorScheme}
          mapRef={setMapRef}
          start={{
            lat: req.start[0],
            lon: req.start[1],
            icon: (
              <CirclePlay
                style={{ height: "32px", width: "32px", color: "#22c55e" }}
              />
            ),
          }}
          finish={null}
          bearing={req.bearing}
          distance={req.distance}
        />
      )}
      {req.type === "route" && (
        <GeoMapRouteView
          colorScheme={colorScheme}
          interactive={false}
          route={req.route.map(([lat, lon]) => ({
            lat,
            lon,

            icon: (
              <CirclePlay
                style={{ height: "32px", width: "32px", color: "#22c55e" }}
              />
            ),
          }))}
          mapRef={setMapRef}
        />
      )}
    </div>
  );
}
