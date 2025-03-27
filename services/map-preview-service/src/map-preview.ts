import puppeteer from "puppeteer";

import { env } from "./env";

export async function handleMapPreviewRequest(): Promise<string> {
  const browser = await puppeteer.launch({
    executablePath: env.CHROME_BIN,
    headless: false,
  });
  const page = await browser.newPage();
  page.on("console", (event) =>
    console.log(
      "inside",
      event.type(),
      event.text(),
      event.stackTrace(),
      event.args(),
    ),
  );
  // const htmlAsset = await env.MAPS.fetch(new URL("https://assets.local/"));
  // await page.setContent(await htmlAsset.text());
  await page.addScriptTag({
    url: "https://unpkg.com/maplibre-gl@^5.3.0/dist/maplibre-gl.js",
  });
  await page.addStyleTag({
    url: "https://unpkg.com/maplibre-gl@^5.3.0/dist/maplibre-gl.css",
  });
  await page.setContent(`
    <div id="map-container"></div>
`);
  await page.evaluate(
    `
console.log("ommomomo");
  //    import { Protocol } from "https://unpkg.com/pmtiles@4.3.0/dist/esm/index.js";
   //   console.log("test inside", maplibregl);
   //   const p = new Protocol();
   //   maplibregl.addProtocol("pmtiles", p.tile);

      const map = new maplibregl.Map({
        container: "map-container",
        style: "https://demotiles.maplibre.org/style.json",
        center: [0, 0],
        zoom: 1,
      });
      map.on("sourcedata", () => {
        const doneDiv = document.createElement("div")
        doneDiv.id = "map-load-done"
        document.querySelector("body")?.appendChild(doneDiv)
      });
console.log("aaaaa");
    `,
  );
  // await page.goto(
  //   `file://${path.join(import.meta.dirname, "../html/index.html")}`,
  // );
  // await page.setContent(`
  //   <div id="map-container"></div>
  // `);
  // await page.evaluate(
  //   `
  //   `,
  //   { p: new Protocol() },
  // );

  // const imageData = (await page.$eval(
  //   ".maplibregl-canvas",
  //   //@ts-expect-error canvas
  //   (el: HTMLCanvasElement) => el.toDataURL(),
  // )) as string;
  //
  await new Promise((resolve) => setTimeout(resolve, 15000));
  const data = await page.evaluate(
    () => document.querySelector("*")?.outerHTML,
  );

  console.log(data);

  await page.waitForSelector("#map-load-done");

  const imageData = await page.evaluate(() => {
    const canvas: HTMLCanvasElement | null =
      document.querySelector(".maplibregl-canvas");
    return canvas?.toDataURL();
  });
  // const imageData = await canvasHandle?.evaluateHandle((canvas) =>
  //   (canvas as unknown as HTMLCanvasElement).toDataURL(),
  // );

  await browser.close();

  return imageData || "";
}
