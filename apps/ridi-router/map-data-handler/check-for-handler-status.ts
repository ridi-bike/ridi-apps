import { getDb, locations, ridiLogger } from "@ridi-router/lib";

import { array, parse, string } from "valibot";

const regions = parse(
  array(string()),
  JSON.parse(Deno.readTextFileSync(locations.getRegionListFileLoc())),
);

export function checkForHandlerStatus() {
  const db = getDb();

  ridiLogger.debug("Checking handler status");
  const nextRecords = db.mapData.getRecordsAllNext();
  if (
    regions.every((r) =>
      nextRecords.find((nr) =>
        nr.region === r && (nr.status === "ready" || nr.status === "error")
      )
    )
  ) {
    ridiLogger.debug("All regions processed, setting handler to idle");
    db.handlers.updateRecordDone("map-data");
  } else {
    db.handlers.updateRecordUpdatedAt("map-data");
  }
}
