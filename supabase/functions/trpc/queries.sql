-- name: RoutesGet :many
select 
	r.id,
	r.name,
	r.created_at,
	p.id as plan_id,
	p.name as plan_name,
	p.state as plan_state,
	rp.id as point_id,
	rp.lat as point_lat,
	rp.lon as point_lon,
	rp.order_in_route as point_order
from routes r
inner join plans p
	on p.id = r.plan_id
left join route_points rp
	on rp.route_id = r.id
where r.user_id = $1
	and r.id = $2
order by 
	r.created_at desc, 
	rp.order_in_route asc;

-- name: PlanList :many
select 
	p.id,
	p.name,
	p.from_lat,
	p.from_lon,
	p.to_lat,
	p.to_lon,
	p.state,
	p.created_at,
	r.id as route_id,
	r.name as route_name,
	r.created_at as route_created_at,
	rp.id as point_id,
	rp.lat as point_lat,
	rp.lon as point_lon,
	rp.order_in_route as point_order
from plans p
left join routes r 
	on r.plan_id = p.id
left join route_points rp
	on rp.route_id = r.id
		and mod(round(rp.order_in_route, 0), 100) = 0
where p.user_id = $1
order by
	p.created_at desc,
	rp.order_in_route asc;

-- name: PlanCreate :one
insert into plans (user_id, id, name, from_lat, from_lon, to_lat, to_lon)
values ($1, $2, $3, $4, $5, $6, $7)
returning id;
