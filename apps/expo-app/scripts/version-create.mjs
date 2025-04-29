import fs from "node:fs";

fs.writeFileSync(
  "./dist/version.json",
  JSON.stringify({ version: Date.now() }),
  { encoding: "utf8" },
);
