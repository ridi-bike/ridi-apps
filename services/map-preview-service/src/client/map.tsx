import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
// import { Protocol } from "@protomaps/basemaps";

export function MapTest() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  useEffect(() => {
    //    import { Protocol } from "https://unpkg.com/pmtiles@4.3.0/dist/esm/index.js";
    //   console.log("test inside", maplibregl);
    //   const p = new Protocol();
    //   maplibregl.addProtocol("pmtiles", p.tile);

    mapRef.current = new maplibregl.Map({
      container: "map-container",
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 0],
      zoom: 1,
    });
    // const done = () => {
    //   const doneDiv = document.createElement("div");
    //   doneDiv.id = "map-load-done";
    //   document.querySelector("body")?.appendChild(doneDiv);
    //   map.off("sourcedata", done);
    // };
    // map.on("sourcedata", done);
    // console.log("aaaaa");
  }, []);

  return (
    <div id="outer-container" style={{ width: "200px", height: "200px" }}>
      <div id="map-container" />
    </div>
  );
}
