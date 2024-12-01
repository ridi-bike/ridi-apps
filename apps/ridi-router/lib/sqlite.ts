import { Database } from "sqlite";
import { RidiLogger } from "./logger.ts";
import {
  type InferInput,
  integer,
  literal,
  nullable,
  number,
  object,
  parse,
  pipe,
  string,
  union,
} from "valibot";
import { BaseEnvVariables } from "./env.ts";

const ridiLogger = RidiLogger.get(BaseEnvVariables.get());

const mapDataRecordSchema = object({
  id: pipe(number(), integer()),
  region: string(),
  version: union([
    literal("current"),
    literal("previous"),
    literal("next"),
    literal("discarded"),
  ]),
  status: union([
    literal("new"),
    literal("downloaded"),
    literal("processing"),
    literal("ready"),
    literal("error"),
  ]),
  pbf_location: string(),
  pbf_md5: string(),
  cache_location: string(),
  router_version: string(),
  kml_location: string(),
  error: nullable(string()),
});
export type MapDataRecord = InferInput<typeof mapDataRecordSchema>;

const handlersRecordSchema = object({
  name: union([literal("map-data"), literal("router"), literal("deploy")]),
  router_version: string(),
  status: union([literal("triggered"), literal("processing"), literal("done")]),
  updated_at: pipe(number(), integer()),
});
export type HandlersRecord = InferInput<typeof handlersRecordSchema>;

function toMapDataRow(row: Record<string, unknown>) {
  const parsedRow = parse(mapDataRecordSchema, row);
  return parsedRow;
}
let db: Database | null = null;

export function initDb(dbLocation: string) {
  ridiLogger.debug("Opening database", { dbLocation });
  db = new Database(dbLocation, { create: true });
  ridiLogger.debug("Database instance created", { db });
}
function dbIsOk(db: Database | null): asserts db is Database {
  if (!db) {
    throw Error("db not initialized");
  }
}
export function getDb() {
  dbIsOk(db);

  db.prepare(`
		create table if not exists map_data (
			id integer primary key autoincrement,
			region text not null,
			version text not null check(version in ('current', 'previous', 'next', 'discarded')),
			status text not null check(status in ('new', 'downloaded', 'processing', 'ready', 'error')),
			pbf_location text not null,
			pbf_md5 text not null,
			cache_location text not null,
			router_version text not null,
			kml_location text not null,
			error text
		);
		`).run();

  db.prepare(`
		create table if not exists handlers (
			name text check(name in ('map-data', 'router', 'deploy')) primary key,
			router_version text not null,
			status text not null check(status in ('triggered', 'processing', 'done')),
			updated_at integer not null
		);
		`).run();

  return {
    handlers: {
      get(name: HandlersRecord["name"]) {
        dbIsOk(db);
        ridiLogger.debug("handlers.get called", { name });
        const handlerData = db.sql`select * from handlers 
																		where name = ${name}`;
        ridiLogger.debug("handlers.get result", { handlerData });
        if (handlerData.length > 1) {
          throw new Error("encountered more than one row");
        }
        return handlerData[0]
          ? parse(handlersRecordSchema, handlerData[0])
          : null;
      },
      createUpdate(name: HandlersRecord["name"], routerVersion: string) {
        dbIsOk(db);
        ridiLogger.debug("handlers.createUpdate called", {
          name,
          routerVersion,
        });
        const handlerRecord = db.sql`select * from handlers 
									where name = ${name}`[0];
        ridiLogger.debug("Select result", { handlerRecord });
        if (handlerRecord) {
          db.sql`update handlers
									set 
										router_version = ${routerVersion}, 
										updated_at = ${new Date().getTime()},
										status = 'triggered'
									where name = ${name}`;
          ridiLogger.debug("Update completed");
        } else {
          db.sql`insert into handlers
									(name, router_version, status, updated_at)
									values 
									(${name}, ${routerVersion}, 'triggered', ${
            new Date().getTime()
          })`;
          ridiLogger.debug("Insert completed");
        }
      },
      updateRecordProcessing(name: HandlersRecord["name"]) {
        dbIsOk(db);
        ridiLogger.debug("handlers.updateRecordProcessing called", { name });
        db.sql`update handlers
								set status = 'processing', updated_at = ${new Date().getTime()}
								where name = ${name}`;
        ridiLogger.debug("Update completed");
      },
      updateRecordUpdatedAt(name: HandlersRecord["name"]) {
        dbIsOk(db);
        ridiLogger.debug("handlers.updateRecordUpdatedAt called", { name });
        db.sql`update handlers
								set updated_at = ${new Date().getTime()}
								where name = ${name}`;
        ridiLogger.debug("Update completed");
      },
      updateRecordDone(name: HandlersRecord["name"]) {
        dbIsOk(db);
        ridiLogger.debug("handlers.updateRecordIdle called", { name });
        db.sql`update handlers
								set status = 'done', updated_at = ${new Date().getTime()}
								where name = ${name}`;
        ridiLogger.debug("Update completed");
      },
    },
    mapData: {
      createNextRecord(
        region: string,
        md5: string,
        pbfLocation: string,
        routerVersion: string,
        cacheLocation: string,
        kmlLocation: string,
      ) {
        dbIsOk(db);
        ridiLogger.debug("mapData.createNextRecord called", {
          region,
          md5,
          pbfLocation,
          routerVersion,
          cacheLocation,
        });
        const mapData = db
          .sql`insert into map_data 
								(
									region, 
									version, 
									status, 
									pbf_location, 
									pbf_md5, 
									cache_location, 
									router_version, 
									kml_location
								)
								values 
								(
									${region}, 
									'next', 
									'new', 
									${pbfLocation}, 
									${md5}, 
									${cacheLocation}, 
									${routerVersion}, 
									${kmlLocation}
								)
								returning *`;

        if (mapData.length > 1) {
          throw new Error("more than one returned after insert");
        }
        return toMapDataRow(mapData[0]);
      },
      deleteRecord(id: number) {
        dbIsOk(db);
        db.sql`delete from map_data
								where id = ${id}`;
      },
      updateRecordDownloaded(id: number) {
        dbIsOk(db);
        db.sql`update map_data
								set status = 'downloaded'
								where id = ${id}`;
      },
      updateRecordProcessing(id: number) {
        dbIsOk(db);
        db.sql`update map_data
								set status = 'processing'
								where id = ${id}`;
      },
      updateRecordReady(id: number) {
        dbIsOk(db);
        db.sql`update map_data
								set status = 'ready'
								where id = ${id}`;
      },
      updateRecordError(id: number, error: string) {
        dbIsOk(db);
        db.sql`update map_data
								set status = 'error', error = ${error}
								where id = ${id}`;
      },
      updateRecordDiscarded(id: number) {
        dbIsOk(db);
        db.sql`update map_data
								set version = 'discarded'
								where id = ${id}`;
      },
      getRecordsDiscardedAndPrevious() {
        dbIsOk(db);
        return db.sql`select * from map_data
								where version = 'discarded' or version = 'previous'`.map((r) =>
          parse(mapDataRecordSchema, r)
        );
      },
      isPbfInUse(pbfFile: string) {
        dbIsOk(db);
        const inUseRecs = db.sql`select * from map_data
								where pbf_location = ${pbfFile}
									and (version = 'current' or version = 'next')`;
        return inUseRecs.length > 0;
      },
      isCacheDirInUse(cacheDir: string) {
        dbIsOk(db);
        const inUseRecs = db.sql`select * from map_data
								where cache_location = ${cacheDir}
									and (version = 'current' or version = 'next')`;
        return inUseRecs.length > 0;
      },
      getRecordNext(region: string): MapDataRecord | null {
        dbIsOk(db);
        const mapData = db
          .sql`select * from map_data 
								where region = ${region} 
									and version = 'next'`;
        if (mapData.length > 1) {
          throw new Error("encountered more than one row");
        }
        return mapData[0] ? toMapDataRow(mapData[0]) : null;
      },
      getRecordCurrent(region: string): MapDataRecord | null {
        dbIsOk(db);
        const mapData = db
          .sql`select * from map_data 
								where region = ${region} 
									and version = 'current'`;
        if (mapData.length > 1) {
          throw new Error("encountered more than one row");
        }
        return mapData[0] ? toMapDataRow(mapData[0]) : null;
      },
      getRecordsAllNext(): MapDataRecord[] {
        dbIsOk(db);
        const mapData = db
          .sql`select * from map_data 
								where version = 'next'`;
        return mapData.map((row) => toMapDataRow(row));
      },
    },
    close() {
      dbIsOk(db);
      db.close();
    },
    db,
  };
}
