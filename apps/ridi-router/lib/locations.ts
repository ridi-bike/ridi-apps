import { parse, string } from "valibot";

function getEnvVariable(name: string): string {
	const maybeVal = Deno.env.get(name);

	const val = parse(string(`missing ${name} env var`), maybeVal);

	return val;
}

const regionListLoc = getEnvVariable("REGION_LIST");
const dataDir = getEnvVariable("RIDI_DATA_DIR");
export const locations = {
	getRegionListFileLoc() {
		return regionListLoc;
	},
	getDbFileLoc() {
		return `${dataDir}/db/sqlite.db`;
	},
	async getCacheDirLoc(region: string, routerVersion: string) {
		const loc = `${dataDir}/cache/${routerVersion}/${region}`;
		await Deno.mkdir(loc, { recursive: true });
		return loc;
	},
	async getPbfFileLoc(region: string, md5: string) {
		const loc = `${dataDir}/pbf/${region}/${md5}`;
		await Deno.mkdir(loc, { recursive: true });
		return `${loc}/osm.pbf`;
	},
};
