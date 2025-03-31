import { layers, namedFlavor } from "@protomaps/basemaps";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef } from "react";
// import { Protocol } from "@protomaps/basemaps";
//
const theme = "dark";

const p = new Protocol();
maplibregl.addProtocol("pmtiles", p.tile);

export function MapTest() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  useEffect(() => {
    mapRef.current = new maplibregl.Map({
      container: "map-container",
      style: {
        version: 8,
        glyphs:
          "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
        sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
        sources: {
          protomaps: {
            type: "vector",
            url: "pmtiles://https://maps.ridi.bike/map.pmtiles",
            attribution:
              '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
          },
          "protomaps-terrain": {
            type: "raster-dem",
            url: "pmtiles://https://maps.ridi.bike/terrarium.pmtiles",
            encoding: "terrarium",
          },
        },
        layers: [
          ...layers(
            "protomaps",
            {
              ...namedFlavor(theme),
              ...(theme === "dark"
                ? {
                    city_label: "#ffeae5",
                    buildings: "#e62600",
                    other: "red",
                    minor_service: "#ff3f1a",
                    minor_a: "#ff6a4d",
                    minor_b: "#ff9580",
                    major: "#ffbfb3",
                    highway: "#ffeae5",
                  }
                : {
                    buildings: "#ff9580",
                    other: "red",
                    minor_service: "#ff411a",
                    minor_a: "#ff411a",
                    minor_b: "#e62700",
                    major: "#b31e00",
                    highway: "#801600",
                  }),
            },
            { lang: "en" },
          ),
          {
            type: "hillshade",
            source: "protomaps-terrain",
            id: "protomaps-terrain",
          },
        ],
      },
      center: [51, 24],
      zoom: 1,
    });
    const done = () => {
      console.log("idle idle idle");
      const doneDiv = document.createElement("div");
      doneDiv.id = "map-load-done";
      const rootDiv = document.getElementById("root");
      if (!rootDiv) {
        throw new Error("root div not found");
      }
      rootDiv.appendChild(doneDiv);
      mapRef.current?.off("sourcedata", done);
    };
    mapRef.current.on("idle", done);
  }, []);

  return <div id="map-container" style={{ width: "600px", height: "600px" }} />;
}
