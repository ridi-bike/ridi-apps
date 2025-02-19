drop table public.regions;

create table public.regions (
  region text not null primary key,
  geojson jsonb not null,
  polygon postgis.geometry null
);
