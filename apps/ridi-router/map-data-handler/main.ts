import { getDb, locations, type MapDataRecord } from "@ridi-router/lib";
import { array, parse, string } from "valibot";
import PQueue from "p-queue";

const cacheProcessorQueue = new PQueue({ concurrency: 1 });

const db = getDb(locations.getDbFileLoc());

const routerBin = parse(
	string("RIDI_ROUTER_BIN env variable"),
	Deno.env.get("RIDI_ROUTER_BIN"),
);

const routerVersion = parse(
	string("RIDI_ROUTER_VERSION env variable"),
	Deno.env.get("RIDI_ROUTER_VERSION"),
);

db.handlers.createUpdate("map-data", routerVersion);

const regions = parse(
	array(string()),
	JSON.parse(Deno.readTextFileSync(locations.getRegionListFileLoc())),
);

console.log({
	regions,
});

async function generateCache(mapDataRecord: MapDataRecord) {
	db.mapData.updateRecordProcessing(mapDataRecord.id);
	const cmd = new Deno.Command(routerBin, {
		args: [
			"cache",
			"-i",
			mapDataRecord.pbf_location,
			"-c",
			mapDataRecord.cache_location,
		],
	});

	const { code, stdout, stderr } = await cmd.output();

	const stdoutOutput = new TextDecoder().decode(stdout);
	const stderrOutput = new TextDecoder().decode(stderr);
	console.log(stdoutOutput);
	console.warn(stderrOutput);
	db.mapData.updateRecordReady(mapDataRecord.id);
	if (code !== 0) {
		console.error("process failed with code", code);
		db.mapData.updateRecordError(
			mapDataRecord.id,
			`stdout: ${stdoutOutput}\n\nstderr: ${stderrOutput}`,
		);
	}
}
async function processRegionList() {
	db.handlers.updateRecordProcessing("map-data");

	for (const region of regions) {
		const remoteMd5Url =
			`https://download.geofabrik.de/${region}-latest.osm.pbf.md5`;
		console.log({ remoteMd5Url });
		const remoteMd5File = await fetch(remoteMd5Url, { redirect: "follow" });
		const remoteMd5 = (await remoteMd5File.text()).split(" ")[0];

		const nextMapData = db.mapData.getNextRecord(region);
		if (nextMapData) {
			if (remoteMd5 !== nextMapData.pbf_md5 || nextMapData.status === "error") {
				db.mapData.updateRecordDiscarded(nextMapData.id);
				await downloadRegion(region, remoteMd5, null);
			} else if (nextMapData.status === "new") {
				await downloadRegion(region, remoteMd5, nextMapData);
			} else if (
				nextMapData.status === "downloaded" ||
				nextMapData.status === "processing"
			) {
				await generateCache(nextMapData);
			}
		} else {
			const currentMapData = db.mapData.getCurrentRecord(region);
			if (currentMapData) {
				if (remoteMd5 !== currentMapData.pbf_md5) {
					await downloadRegion(region, remoteMd5, null);
				}
			} else {
				await downloadRegion(region, remoteMd5, null);
			}
		}
	}
}

async function downloadRegion(
	region: string,
	md5: string,
	nextMapDataRecord: MapDataRecord | null,
) {
	const remoteFileUrl =
		`https://download.geofabrik.de/${region}-latest.osm.pbf`;

	const fileLocation = await locations.getPbfFileLoc(region, md5);
	const mapDataRecord = nextMapDataRecord || db.mapData.createNextRecord(
		region,
		md5,
		fileLocation,
		routerVersion,
		await locations.getCacheDirLoc(region, routerVersion),
	);
	console.log({ remoteFileUrl });
	try {
		const fileResponse = await fetch(remoteFileUrl, { redirect: "follow" });

		if (fileResponse.body) {
			const file = await Deno.open(fileLocation, {
				write: true,
				create: true,
			});

			await fileResponse.body.pipeTo(file.writable);
			db.mapData.updateRecordDownloaded(mapDataRecord.id);
			cacheProcessorQueue.add(() => generateCache(mapDataRecord));
		}
	} catch (err) {
		console.error(err);
		db.mapData.updateRecordError(mapDataRecord.id, JSON.stringify(err));
	}
}

function checkForHandlerStatus() {
	const nextRecords = db.mapData.getAllNextRecords();
	if (
		regions.every((r) =>
			nextRecords.find((nr) =>
				nr.region === r && (nr.status === "ready" || nr.status === "error")
			)
		)
	) {
		db.handlers.updateRecordIdle("map-data");
	} else {
		db.handlers.updateRecordUpdatedAt("map-data");
	}
}

processRegionList();

setInterval(checkForHandlerStatus, 10 * 60 * 1000); // every 10 min

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, async (_req) => {
	const handlerRec = db.handlers.get("map-data");
	if (handlerRec) {
		return new Response("ok");
	} else {
		return new Response("nok", { status: 400 });
	}
});
