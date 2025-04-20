-- name: GeoBoundariesList :many
select id, name, level, updated_at from geo_boundaries;

-- name: GeoBoundariesUpsert :exec
insert into geo_boundaries (id, name, level, updated_at, polygon)
values ($1, $2, $3, now(), sqlc.arg(polygon)::text)
on conflict (id) do update
set polygon = excluded.polygon,
  name = excluded.name,
  level = excluded.level,
  updated_at = excluded.updated_at;
