create schema if not exists "postgis";
create extension postgis with schema "postgis";

create type regions_version as enum ('previous', 'current', 'next', 'discarded');

create table public.regions (
	id text not null default ksuid() primary key,
	region text not null,
	pbf_md5 text not null,
	version regions_version not null,
	geojson jsonb not null,
	polygon postgis.geography(POLYGON) not null
);

alter table public.regions enable row level security;

create policy "select only for authed users"
on public.regions
as permissive
for select
to authenticated
using (
	true
);
