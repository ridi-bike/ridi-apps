import { Database } from "sqlite";
import {
	type InferInput,
	integer,
	literal,
	number,
	object,
	parse,
	pipe,
	string,
	union,
} from "valibot";

const mapDataRowSchema = object({
	id: pipe(number(), integer()),
	region: string(),
	version: union([literal("current"), literal("previous"), literal("next")]),
	status: union([
		literal("new"),
		literal("downloaded"),
		literal("processing"),
		literal("ready"),
		literal("error"),
	]),
	pbfLocation: string(),
	pbfMd5: string(),
	cacheLocation: string(),
	cacheRouterVersion: string(),
});
export type MapDataRecord = InferInput<typeof mapDataRowSchema>;

function toMapDataRow(row: Record<string, unknown>) {
	const parsedRow = parse(mapDataRowSchema, row);
	return parsedRow;
}
export function getDb(dbLocation: string) {
	const db = new Database(`${dbLocation}/sqlite.db`);

	db.prepare(`
		create table if not exists map_data (
			id integer primary key autoincrement,
			region text not null,
			version text not null check(version in ('current', 'previous', 'next')),
			status text not null check(status in ('new', 'downloaded', 'processing', 'ready', 'error'))
			pbf_location text not null,
			pbf_mdf text not null,
			cache_location text not null,
			router_version text not null
		);
		`).run();

	return {
		mapData: {
			createNextRecord(
				region: string,
				md5: string,
				pbfLocation: string,
				routerVersion: string,
				cacheLocation: string,
			) {
				const mapData = db
					.sql`insert into map_data 
								(region, version, status, pbf_location, pbf_md5, cache_location, router_version)
								values 
								(${region}, 'next', 'new', ${pbfLocation}, ${md5}, ${cacheLocation}, ${routerVersion})
								returning *`;

				if (mapData.length > 1) {
					throw new Error("more than one returned after insert");
				}
				return toMapDataRow(mapData[0]);
			},
			updateRecordDownloaded(id: number) {
				db.sql`update map_data
								set status = 'downloaded'
								where id = ${id}`;
			},
			updateRecordProcessing(id: number) {
				db.sql`update map_data
								set status = 'processing'
								where id = ${id}`;
			},
			updateRecordReady(id: number) {
				db.sql`update map_data
								set status = 'ready'
								where id = ${id}`;
			},
			updateRecordError(id: number) {
				db.sql`update map_data
								set status = 'ready'
								where id = ${id}`;
			},
			getCurrentRecord(region: string): MapDataRecord | null {
				const mapData = db
					.sql`select * from map_data where region = ${region} and version = 'current'`;
				if (mapData.length > 1) {
					throw new Error("encountered more than one row");
				}
				return mapData[0] ? toMapDataRow(mapData[0]) : null;
			},
		},
		close() {
			db.close();
		},
	};
}
