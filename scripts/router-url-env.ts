const ngrokUrl = "http://localhost:4040/api/tunnels";

let newUrl = "";
do {
	try {
		await new Promise((resolve) => setTimeout(resolve, 2000));
		const resp = await fetch(ngrokUrl);
		if (resp.status === 200) {
			const ngrokData = await resp.json();
			if (ngrokData.tunnels.length) {
				newUrl = ngrokData.tunnels[0].public_url;
			}
		}
	} catch {}
	console.log("waiting for ngrok");
} while (!newUrl);

if (!newUrl) {
	throw new Error("url missing in args");
}

const file = Deno.readTextFileSync("./supabase/functions/.env");
let newFile = "";
for (const line of file.split("\n")) {
	if (line.startsWith("RIDI_ROUTER_BASE_URL")) {
		newFile += `RIDI_ROUTER_BASE_URL=${newUrl}\n`;
	} else {
		newFile += `${line}\n`;
	}
}
Deno.writeTextFileSync("./supabase/functions/.env", newFile);

console.log("URL updated");
