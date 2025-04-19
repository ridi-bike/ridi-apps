-- name: GeoBoundariesList :many
select name, level from geo_boundaries;

-- name: GeoBoundariesGet :one
select name, level from geo_boundaries limit 1;

-- name: GeoBoundariesInsert :exec
insert into geo_boundaries (name)
values ($1);
