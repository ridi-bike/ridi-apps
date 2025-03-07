-- name: PlanSetRegion :exec
update plans
set region = $1
where id = $2;

-- name: PlanDelete :one
update plans
set is_deleted = true
where id = $1
  and user_id = $2
returning *;

-- name: RouteDelete :one
update routes
set is_deleted = true
where id = $1
  and user_id = $2
returning *;

-- name: RouteDeleteByPlanId :one
update routes
set is_deleted = true
where plan_id = $1
  and user_id = $2
returning *;

-- name: RegionInsertOrUpdate :one
insert into regions (region, geojson, polygon)
values ($1, $2, $3)
on conflict (region) do update
set geojson = excluded.geojson,
  polygon = excluded.polygon
returning *;

-- name: RuleSetsList :many 
select * from rule_sets
where (rule_sets.user_id = $1
  or rule_sets.user_id is null)
  and is_deleted = false
order by default_set desc;

-- name: RuleSetRoadTagsList :many
select * from rule_set_road_tags
where (rule_set_road_tags.user_id = $1
  or rule_set_road_tags.user_id is null)
  and rule_set_road_tags.rule_set_id in (
    select id from rule_sets
    where (rule_sets.user_id = $1
      or rule_sets.user_id is null)
      and rule_sets.is_deleted = false
  );

-- name: RuleSetRoadTagsListByRuleSetIdWithDeleted :many
select * from rule_set_road_tags
where (rule_set_road_tags.user_id = $1
  or rule_set_road_tags.user_id is null)
  and rule_set_road_tags.rule_set_id = $2;

-- name: RuleSetUpsert :one
insert into rule_sets (
  id,
  user_id, 
  name
)
values (
  $1,
  $2,
  $3
)
on conflict (id) do update
set name = excluded.name
returning *;

-- name: RuleSetRoadTagsUpsert :one
insert into rule_set_road_tags (
  user_id,
  rule_set_id,
  tag_key,
  value
)
values (
  $1,
  $2,
  $3,
  $4
)
on conflict (rule_set_id, tag_key) do update
set value = excluded.value
returning *;

-- name: RuleSetGet :one
select * from rule_sets
where rule_sets.id = $1
  and rule_sets.is_deleted = false;

-- name: RuleSetSetDeleted :exec
update rule_sets
set is_deleted = true
where id = $1;

-- name: RoutesGet :many
with points_array as (
	select 
		id, 
		array_agg(array[postgis.st_y(p.geom), postgis.st_x(p.geom)] order by p.path) as lat_lon_array
	from routes r, postgis.st_dumppoints(r.linestring) p
	where r.user_id = $1
		and r.id = $2
    and r.is_deleted = false
	group by r.id
) 
select 
	r.id,
	r.name,
	r.created_at,
  r.stats_score,
  r.stats_len_m,
  r.stats_junction_count,
	pa.lat_lon_array,
	p.id as plan_id,
	p.name as plan_name,
	p.state as plan_state
from routes r
inner join plans p
	on p.id = r.plan_id 
    and p.is_deleted = false
inner join points_array pa
	on pa.id = r.id
where r.user_id = $1
	and r.id = $2
  and r.is_deleted = false
order by 
	r.created_at desc;

-- name: RouteStatsGet :many
select * from route_breakdown_stats
where user_id = $1
  and route_id = $2;

-- name: PlanList :many
select 
	p.id,
	p.name,
	p.start_lat,
	p.start_lon,
  p.start_desc,
	p.finish_lat,
	p.finish_lon,
  p.finish_desc,
  p.distance,
  p.bearing,
  p.trip_type,
	p.state,
	p.created_at,
  p.rule_set_id,
	r.id as route_id,
	r.name as route_name,
	r.created_at as route_created_at
from plans p
left join routes r 
	on r.plan_id = p.id
  and r.is_deleted = false
where p.user_id = $1
  and p.is_deleted = false
order by
	p.created_at desc;

-- name: PlanCreate :one
insert into plans (
  user_id, 
  id, 
  name, 
  start_lat, 
  start_lon, 
  finish_lat, 
  finish_lon, 
  start_desc, 
  finish_desc, 
  trip_type,
  distance,
  bearing,
  rule_set_id
)

values (
  $1, 
  $2, 
  $3, 
  $4, 
  $5, 
  $6, 
  $7, 
  $8, 
  $9, 
  $10,
  $11,
  $12,
  $13
)
returning id;

-- name: RegionGet :many
select * from regions;

-- name: RegionFindFromCoords :many
select * from public.regions
where postgis.st_within(postgis.st_point(sqlc.arg(lon), sqlc.arg(lat)), regions.polygon);

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
