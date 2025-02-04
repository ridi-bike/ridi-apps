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
  bearing
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
  $12
)
returning id;
