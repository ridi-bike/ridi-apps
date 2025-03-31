import { GeoMapRouteView, GeoMapPlanView } from "@ridi/geo-maps";
import { CirclePlay, CirclePause } from "lucide-react";
import { mapPreviewSchema } from "@ridi/map-preview-service-contracts";
import { type MapRef } from "@vis.gl/react-maplibre";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useMemo, useRef, useState } from "react";

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
        console.log("idle idle idle");
        const doneDiv = document.createElement("div");
        doneDiv.id = "map-load-done";
        const rootDiv = document.getElementById("root");
        if (!rootDiv) {
          throw new Error("root div not found");
        }
        rootDiv.appendChild(doneDiv);
        mapRef?.getMap().off("idle", done);
      };

      mapRef.getMap().on("idle", done);
    }
  }, [mapRef]);

  if (req.type === "plan-start-finish") {
    return (
      <div style={{ width: "400px", height: "400px" }}>
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
      </div>
    );
  }

  if (req.type === "plan-round-trip") {
    return (
      <div style={{ width: "400px", height: "400px" }}>
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
      </div>
    );
  }

  return (
    <div style={{ width: "400px", height: "400px" }}>
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
    </div>
  );
}

(() => {
  const url = new URL("http://127.0.0.1:2730/");
  url.searchParams.set(
    "req",
    JSON.stringify({
      // type: "plan-start-finish",
      // start: [57.33134, 25.44146],
      // finish: [57.13437, 25.73953],
      // reqId: "omg",
      //
      // type: "plan-round-trip",
      // start: [57.33134, 25.44146],
      // bearing: 34,
      // distance: 100000,
      // reqId: "omg",
      //
      type: "route",
      route: [
        [57.33134, 25.41146],
        [57.34134, 25.42146],
        [57.35134, 25.43146],
        [57.36134, 25.44146],
        [57.37134, 25.45146],
        [57.38134, 25.46146],
        [57.39134, 25.47146],
        [57.40134, 25.48146],
      ],
      reqId: "omg",
    }),
  );
  url.searchParams.set("theme", "light");
  console.log(url.toString());
})();
