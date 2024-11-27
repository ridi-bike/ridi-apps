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
