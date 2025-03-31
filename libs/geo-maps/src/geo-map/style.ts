import { layers, namedFlavor } from "@protomaps/basemaps";
import type maplibre from "maplibre-gl";

export function getMapStyle(
  theme: "light" | "dark",
): maplibre.StyleSpecification {
  return {
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
  };
}
