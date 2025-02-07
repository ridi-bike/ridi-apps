-- name: RulePackRoadTagsGet :many
select * from rule_set_road_tags
where rule_set_id = $1;

-- name: RegionInsertOrUpdate :one
insert into regions
(region, pbf_md5, version, geojson, polygon)
values
($1, $2, 'next', $3, $4)
on conflict (region, pbf_md5, version) do update
set geojson = excluded.geojson,
	polygon = excluded.polygon
returning *;

-- name: RegionGetAllCurrent :many
select * from regions
where version = 'current';

-- name: RegionSetDiscarded :one
update regions
set version = 'discarded'
where region = $1 and pbf_md5 = $2
returning *;

-- name: RegionDeleteDiscardedAndPrevious :exec
delete from regions
where region = $1 
	and pbf_md5 = $2 
	and (version = 'discarded' 
		or version = 'previous');

-- name: RegionSetAllPrevious :exec
update regions
set version = 'previous'
where regions.version = 'current';

-- name: RegionSetCurrent :exec
update regions
set version = 'current'
where regions.region = $1
	and regions.pbf_md5 = $2;

-- name: RegionFindFromCoords :many
select * from public.regions
where version = 'current'
	and postgis.st_within(postgis.st_point(sqlc.arg(lon), sqlc.arg(lat)), regions.polygon);

-- name: RegionGetCount :one
select count(*) from regions;

-- name: PlanGetById :one
select * from plans
where plans.id = $1;

-- name: PlansGetNew :many
select * from plans
where state = 'new';

-- name: PlanSetState :exec
update plans
set 
	state = $1, 
	modified_at = now()
where plans.id = $2;

-- name: RouteInsert :one
-- select postgis.st_point(( el->>'a' )::numeric, ( el->>'b' )::numeric) from (select jsonb_array_elements('[{"a":1,"b":2},{"a":3,"b":4}]'::jsonb) el) arrayEl
insert into routes (
	name, 
	user_id, 
	plan_id, 
  stats_len_m,
  stats_junction_count,
  stats_score,
	linestring
)
values (
	$1, 
	$2, 
	$3, 
  $4,
  $5,
  $6,
	postgis.st_makeline(
		array(
			select 
				postgis.st_point((p->>1)::numeric, (p->>0)::numeric)
			from (
				select jsonb_array_elements(sqlc.arg(lat_lon_array)::jsonb) p
			) arrayPoints
		)
	)
)
returning *;

-- name: RouteBreakdownStatsInsert :one
insert into route_breakdown_stats (
  user_id,
  route_id,
  stat_type,
  stat_name,
  len_m,
  percentage
)
values (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
returning *;

-- name: ServicesGet :one
SELECT * FROM ridi_services.services 
WHERE name = $1;

-- name: ServicesCreateUpdate :exec
INSERT INTO ridi_services.services (name, router_version, status, updated_at)
VALUES ($1, $2, 'triggered', NOW())
ON CONFLICT (name) DO UPDATE 
SET 
    router_version = $2, 
    updated_at = NOW(),
    status = 'triggered';

-- name: ServicesUpdateRecordProcessing :exec
UPDATE ridi_services.services
SET status = 'processing', updated_at = NOW()
WHERE name = $1;

-- name: ServicesUpdateRecordUpdatedAt :exec
UPDATE ridi_services.services
SET updated_at = NOW()
WHERE name = $1;

-- name: ServicesUpdateRecordDone :exec
UPDATE ridi_services.services
SET status = 'done', updated_at = NOW()
WHERE name = $1;

-- name: MapDataCreateNextRecord :one
INSERT INTO ridi_services.map_data 
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
VALUES 
(
    $1, 
    'next', 
    'new', 
    $2, 
    $3, 
    $4, 
    $5, 
    $6,
    NOW()
)
RETURNING *;

-- name: MapDataDeleteRecord :exec
DELETE FROM ridi_services.map_data
WHERE id = $1;

-- name: MapDataUpdateRecordCacheSize :exec
UPDATE ridi_services.map_data
SET
    cache_size = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: MapDataUpdateRecordStartupTime :exec
UPDATE ridi_services.map_data
SET
    startup_time_s = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: MapDataUpdateRecordPbfSize :exec
UPDATE ridi_services.map_data
SET
    pbf_size = $2,
    pbf_downloaded_size = 0,
    updated_at = NOW()
WHERE id = $1;

-- name: MapDataUpdateRecordPbfDownloadedSize :exec
UPDATE ridi_services.map_data
SET
    pbf_downloaded_size = pbf_downloaded_size + $2,
    updated_at = NOW()
WHERE id = $1;

-- name: MapDataUpdateRecordDownloaded :exec
UPDATE ridi_services.map_data
SET 
    status = 'downloaded', 
    updated_at = NOW()
WHERE id = $1;

-- name: MapDataUpdateRecordProcessing :exec
UPDATE ridi_services.map_data
SET 
    status = 'processing', 
    updated_at = NOW()
WHERE id = $1;

-- name: MapDataUpdateRecordReady :exec
UPDATE ridi_services.map_data
SET 
    status = 'ready', 
    updated_at = NOW()
WHERE id = $1;

-- name: MapDataUpdateRecordError :exec
UPDATE ridi_services.map_data
SET 
    status = 'error', 
    error = $2, 
    updated_at = NOW()
WHERE id = $1;

-- name: MapDataUpdateRecordDiscarded :exec
UPDATE ridi_services.map_data
SET 
    version = 'discarded',
    updated_at = NOW()
WHERE id = $1;

-- name: MapDataGetRecordsDiscardedAndPrevious :many
SELECT * FROM ridi_services.map_data
WHERE version = 'discarded' OR version = 'previous';

-- name: MapDataIsKmlInUse :one
SELECT * FROM ridi_services.map_data
WHERE 
    kml_location = $1
    AND (version = 'current' OR version = 'next')
LIMIT 1;

-- name: MapDataIsPbfInUse :one
SELECT * FROM ridi_services.map_data
WHERE 
    pbf_location = $1
    AND (version = 'current' OR version = 'next')
LIMIT 1;

-- name: MapDataIsCacheDirInUse :one
SELECT * FROM ridi_services.map_data
WHERE 
    cache_location = $1
    AND (version = 'current' OR version = 'next')
LIMIT 1;

-- name: MapDataGetRecordNext :one
SELECT * FROM ridi_services.map_data 
WHERE 
    region = $1 
    AND version = 'next';

-- name: MapDataGetRecordCurrent :one
SELECT * FROM ridi_services.map_data 
WHERE 
    region = $1 
    AND version = 'current';

-- name: MapDataGetRecordsAllNext :many
SELECT * FROM ridi_services.map_data 
WHERE version = 'next';

-- name: MapDataGetRecordsAllCurrent :many
SELECT * FROM ridi_services.map_data 
WHERE version = 'current';

-- name: MapDataUpdateRecordsPromoteNext :exec
UPDATE ridi_services.map_data
SET version = 'current'
WHERE version = 'next';

-- name: MapDataUpdateRecordsDemoteCurrent :exec
UPDATE ridi_services.map_data
SET version = 'previous'
WHERE version = 'current';
