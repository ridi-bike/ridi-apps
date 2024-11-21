import { getDb, locations, type MapDataRecord } from "@ridi-router/lib";
import { array, parse, string } from "valibot";
import PQueue from "p-queue";

const cacheProcessorQueue = new PQueue({ concurrency: 1 });

const db = getDb(locations.getDbFileLoc());

const routerVersion = parse(
	string("RIDI_ROUTER_VERSION env variable"),
	Deno.env.get("RIDI_ROUTER_VERSION"),
);

const regions = parse(
	array(string()),
	JSON.parse(Deno.readTextFileSync(locations.getRegionListFileLoc())),
);

async function generateCache(mapDataRecord: MapDataRecord) {
	db.mapData.updateRecordProcessing(mapDataRecord.id);
	const cmd = new Deno.Command("ridi-router", {
		args: [
			"cache",
			"-i",
			mapDataRecord.pbfLocation,
			"-c",
			mapDataRecord.cacheLocation,
		],
	});

	const { code, stdout, stderr } = await cmd.output();

	console.log(new TextDecoder().decode(stdout));
	console.warn(new TextDecoder().decode(stderr));
	db.mapData.updateRecordReady(mapDataRecord.id);
	if (code !== 0) {
		console.error("process failed with code", code);
		db.mapData.updateRecordError(mapDataRecord.id);
	}
}
async function processRegionList() {
	for (const region in regions) {
		const remoteMd5Url =
			`https://download.geofabrik.de/${region}-latest.osm.pbf.md5`;
		const remoteMd5File = await fetch(remoteMd5Url);
		const remoteMd5 = (await remoteMd5File.text()).split(" ")[0];

		const currentMapData = db.mapData.getCurrentRecord(region);
		if (currentMapData) {
			if (remoteMd5 !== currentMapData.pbfMd5) {
				await downloadRegion(region, remoteMd5);
			}
		} else {
			await downloadRegion(region, remoteMd5);
		}
	}
}

async function downloadRegion(region: string, md5: string) {
	const remoteFileUrl =
		`https://download.geofabrik.de/${region}-latest.osm.pbf`;

	const fileResponse = await fetch(remoteFileUrl);

	const fileLocation = await locations.getPbfFileLoc(region, md5);
	const mapDataRecord = db.mapData.createNextRecord(
		region,
		md5,
		fileLocation,
		routerVersion,
		await locations.getCacheDirLoc(region, routerVersion),
	);

	if (fileResponse.body) {
		const file = await Deno.open(fileLocation, {
			write: true,
			create: true,
		});

		await fileResponse.body.pipeTo(file.writable);
		db.mapData.updateRecordDownloaded(mapDataRecord.id);
		cacheProcessorQueue.add(() => generateCache(mapDataRecord));
	}
}

processRegionList();

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, async (_req) => {
	return new Response("Hello, world");
});
