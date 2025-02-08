-- name: RuleSetsList :many 
select * from rule_sets
where rule_sets.user_id = $1
  or rule_sets.user_id is null;

-- name: RuleSetRoadTagsGet :many
select * from rule_set_road_tags
where rule_set_road_tags.user_id = $1
  or rule_set_road_tags.user_id is null;

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
where rule_sets.id = $1;

-- name: RuleSetDelete :exec
delete from rule_sets
where id = $1;

-- name: RoutesGet :many
with points_array as (
	select 
		id, 
		array_agg(array[postgis.st_y(p.geom), postgis.st_x(p.geom)] order by p.path) as lat_lon_array
	from routes r, postgis.st_dumppoints(r.linestring) p
	where r.user_id = $1
		and r.id = $2
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
inner join points_array pa
	on pa.id = r.id
where r.user_id = $1
	and r.id = $2
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
where p.user_id = $1
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
