-- name: RegionInsert :one
insert into regions
(region, pbf_md5, version, geojson, polygon)
values
($1, $2, 'next', $3, $4)
returning *;

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

-- name: PlanSetState :exec
update plans
set 
	state = $1, 
	modified_at = now()
where plans.id = $2;

-- name: RouteInsert :one
insert into routes (name, user_id, plan_id)
values ($1, $2, $3)
returning *;

-- name: RoutePointInsert :one
insert into route_points (user_id, route_id, sequence, lat, lon)
values ($1, $2, $3, $4, $5)
returning *;
