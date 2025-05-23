-- name: GeoBoundariesFindCoords :many
select * from geo_boundaries
where postgis.st_within(postgis.st_point(sqlc.arg(lon), sqlc.arg(lat)), geo_boundaries.polygon);

-- name: RouteGet :one
with points_array as (
	select 
		id, 
		array_agg(array[postgis.st_y(p.geom), postgis.st_x(p.geom)] order by p.path) as lat_lon_array
	from routes r, postgis.st_dumppoints(r.linestring) p
	where r.id = $1
	group by r.id
) 
select 
  r.*,
	pa.lat_lon_array
from routes r
inner join points_array pa
	on pa.id = r.id
where r.id = $1
order by 
	r.created_at desc;

-- name: RoutesListDownloaded :many
select * from routes r
where r.downloaded_at is not null
  and r.user_id = $1
  and is_deleted = false
order by 
	r.created_at desc;

-- name: RouteSetDownloadedAt :one
update routes
set downloaded_at = $1
where id = $2 and downloaded_at is null
returning *;

-- name: RouteUpdateMapPreview :exec
update routes
set map_preview_dark = $1,
  map_preview_light = $2
where id = $3;

-- name: PlanUpdateMapPreview :exec
update plans
set map_preview_dark = $1,
  map_preview_light = $2
where id = $3;

-- name: UserClaimPlans :exec
update plans
set user_id = sqlc.arg(to_user_id)
where user_id = sqlc.arg(from_user_id);

-- name: UserClaimRoutes :exec
update routes
set user_id = sqlc.arg(to_user_id)
where user_id = sqlc.arg(from_user_id);

-- name: UserClaimRouteBreakdownStats :exec
update route_breakdown_stats
set user_id = sqlc.arg(to_user_id)
where user_id = sqlc.arg(from_user_id);

-- name: UserClaimRuleSets :exec
update rule_sets
set user_id = sqlc.arg(to_user_id)
where user_id = sqlc.arg(from_user_id);

-- name: UserClaimRuleSetRoadTags :exec
update rule_set_road_tags
set user_id = sqlc.arg(to_user_id)
where user_id = sqlc.arg(from_user_id);

-- name: PrivateCodeGet :one
select * from private.codes
where code = $1;

-- name: PrivateCodeClaim :exec
update private.codes
set claimed_at = now(), 
    claimed_by_user_id = $1
where code = $2;

-- name: PrivateUserInsert :one
insert into private.users (user_id)
values ($1)
returning *;

-- name: PrivateUserDecreaseDownloads :one
update private.users
set download_count_remain = download_count_remain - 1
where user_id = $1
returning *;

-- name: PrivateUsersUpdateWithSubscriptionCode :exec
update private.users 
set sub_type = $1
where user_id = $2
returning *;

-- name: PrivateUsersUpdateStripeCustomerId :exec
update private.users
set stripe_customer_id = $1
where user_id = $2;

-- name: PrivateUsersUpdateSubType :exec
update private.users
set sub_type = $1
where user_id = $2;

-- name: PrivateUsersUpdateStripeData :exec
update private.users
set stripe_status = $1,
  stripe_subscription_id = $3,
  stripe_price_id = $4,
  stripe_current_period_end = $5,
  stripe_current_period_start = $6,
  stripe_cancel_at_period_end = $7,
  stripe_payment_method = $8,
  stripe_flow_status = 'confirmed',
  sub_type = $9
where user_id = $2;

-- name: PrivateUsersUpdateInitiated :exec
update private.users
set stripe_status = 'initiated',
  stripe_checkout_id = $1
where user_id = $2;

-- name: PrivateUsersUpdateCompleted :exec
update private.users
set stripe_flow_status = 'completed'
where user_id = $1;

-- name: PrivateUsersUpdateStripeStatusNone :exec
update private.users
set stripe_status = 'none'
where user_id = $1;

-- name: PrivateUsersGetRow :one
select * from private.users
where user_id = $1;

-- name: PrivateUsersGetRowByStripeCustomerId :one
select * from private.users
where stripe_customer_id = $1;

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
  and downloaded_at is null
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
	r.downloaded_at,
  r.stats_score,
  r.stats_len_m,
  r.stats_junction_count,
  r.map_preview_light,
  r.map_preview_dark,
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
  p.map_preview_light,
  p.map_preview_dark,
	r.id as route_id,
	r.name as route_name,
	r.created_at as route_created_at,
  r.stats_len_m,
  r.map_preview_light as route_map_preview_light,
  r.map_preview_dark as route_map_preview_dark,
  r.downloaded_at as route_downloaded_at
from plans p
left join routes r 
	on r.plan_id = p.id
  and r.is_deleted = false
where p.user_id = $1
  and p.is_deleted = false
order by
	p.created_at desc,
  r.stats_len_m asc;

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
