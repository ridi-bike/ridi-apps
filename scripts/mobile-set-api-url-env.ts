import { fetch } from "bun";
import { readFileSync, writeFileSync } from "node:fs";

const ngrokUrl = "http://localhost:4040/api/tunnels";

let newUrl = "";
do {
	const resp = await fetch(ngrokUrl);
	if (resp.status === 200) {
		const ngrokData = await resp.json();
		if (ngrokData.tunnels.length) {
			newUrl = ngrokData.tunnels[0].public_url;
		}
	}
} while (!newUrl);

newUrl += "/api/trpc";

if (!newUrl) {
	throw new Error("url missing in args");
}

const file = readFileSync("apps/mobile/.env", { encoding: "utf8" });
let newFile = "";
for (const line of file.split("\n")) {
	if (line.startsWith("RIDI_API_URL")) {
		newFile += `RIDI_API_URL=${newUrl}\n`;
	} else {
		newFile += `${line}\n`;
	}
}
writeFileSync("apps/mobile/.env", newFile);
