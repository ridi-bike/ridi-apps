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
  updated_at: pipe(number(), integer()),
  pbf_size: nullable(pipe(number(), integer())),
  pbf_downloaded_size: nullable(pipe(number(), integer())),
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

function migrate(fn: (db: Database) => void, expectedVersion: number) {
  dbIsOk(db);
  let currentVersion: number | undefined = undefined;
  try {
    currentVersion = db
      .sql`select max(version) as version from db_version`[0]
      ?.version;
  } catch (err) {
    const errText = JSON.stringify(err);
    if (errText.search("no such table: db_version") !== -1) {
      throw err;
    }
  }
  if (!currentVersion || currentVersion < expectedVersion) {
    fn(db);
    db.sql`insert into db_version (version) values (${expectedVersion});`;
  }
}

export function initDb(dbLocation: string) {
  const ridiLogger = RidiLogger.get(new BaseEnvVariables());

  ridiLogger.debug("Opening database", { dbLocation });
  db = new Database(dbLocation, { create: true });
  ridiLogger.debug("Database instance created", { db });
  migrate((db) =>
    db.prepare(`
			create table if not exists db_version (
				version integer primary key
			);
		`).run(), 1);

  migrate((db) =>
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
		`).run(), 2);

  migrate((db) =>
    db.prepare(`
			create table if not exists handlers (
				name text check(name in ('map-data', 'router', 'deploy')) primary key,
				router_version text not null,
				status text not null check(status in ('triggered', 'processing', 'done')),
				updated_at integer not null
			);
		`).run(), 3);

  migrate(
    (db) =>
      db.prepare(`
				alter table map_data 
					add column updated_at integer not null default 0;
			`).run(),
    4,
  );

  migrate(
    (db) =>
      db.prepare(`
				alter table map_data
					add column pbf_size integer;
			`).run(),
    5,
  );

  migrate(
    (db) =>
      db.prepare(`
				alter table map_data
					add column pbf_downloaded_size integer;
			`).run(),
    6,
  );

  ridiLogger.debug("Migrations done");
}
function dbIsOk(db: Database | null): asserts db is Database {
  if (!db) {
    throw Error("db not initialized");
  }
}
export function getDb() {
  dbIsOk(db);

  const ridiLogger = RidiLogger.get(new BaseEnvVariables());

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
									kml_location,
									updated_at
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
									${kmlLocation},
									${new Date().getTime()}
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
      updateRecordSize(id: number, size: number) {
        dbIsOk(db);
        db.sql`
					update map_data
					set
						pbf_size = ${size},
						pbf_downloaded_size = 0,
						updated_at = ${new Date().getTime()}
					where id = ${id}`;
      },
      updateRecordDownloadedSize(id: number, addedSize: number) {
        dbIsOk(db);
        db.sql`
					update map_data
					set
						pbf_downloaded_size = pbf_downloaded_size + ${addedSize},
						updated_at = ${new Date().getTime()}
					where id = ${id}`;
      },
      updateRecordDownloaded(id: number) {
        dbIsOk(db);
        db.sql`update map_data
								set 
									status = 'downloaded', 
									updated_at = ${new Date().getTime()}
								where id = ${id}`;
      },
      updateRecordProcessing(id: number) {
        dbIsOk(db);
        db.sql`update map_data
								set 
									status = 'processing', 
									updated_at = ${new Date().getTime()}
								where id = ${id}`;
      },
      updateRecordReady(id: number) {
        dbIsOk(db);
        db.sql`update map_data
								set 
									status = 'ready', 
									updated_at = ${new Date().getTime()}
								where id = ${id}`;
      },
      updateRecordError(id: number, error: string) {
        dbIsOk(db);
        db.sql`update map_data
								set 
									status = 'error', 
									error = ${error}, 
									updated_at = ${new Date().getTime()}
								where id = ${id}`;
      },
      updateRecordDiscarded(id: number) {
        dbIsOk(db);
        db.sql`update map_data
								set 
									version = 'discarded',
									updated_at = ${new Date().getTime()}
								where id = ${id}`;
      },
      getRecordsDiscardedAndPrevious() {
        dbIsOk(db);
        return db.sql`select * from map_data
								where version = 'discarded' or version = 'previous'`.map((r) =>
          parse(mapDataRecordSchema, r)
        );
      },
      isKmlInUse(kmlFile: string) {
        dbIsOk(db);
        const inUseRecs = db.sql`select * from map_data
								where kml_location = ${kmlFile}
									and (version = 'current' or version = 'next')`;
        return inUseRecs.length > 0;
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
