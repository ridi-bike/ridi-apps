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
    const loc = `${dataDir}/db`;
    try {
      Deno.mkdirSync(loc, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }
    return `${loc}/sqlite.db`;
  },
  async getCacheDirLoc(region: string, routerVersion: string, pbfMd5: string) {
    const loc = `${dataDir}/cache/${routerVersion}/${region}/${pbfMd5}`;
    try {
      await Deno.mkdir(loc, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }
    return loc;
  },
  async getPbfFileLoc(region: string, md5: string) {
    const loc = `${dataDir}/pbf/${region}/${md5}`;
    try {
      await Deno.mkdir(loc, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }
    return `${loc}/osm.pbf`;
  },
  async getKmlLocation(region: string, md5: string) {
    const loc = `${dataDir}/pbf/${region}/${md5}`;
    try {
      await Deno.mkdir(loc, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }
    return `${loc}/osm.kml`;
  },
};
