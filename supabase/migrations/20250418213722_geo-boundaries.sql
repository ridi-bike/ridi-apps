create table geo_boundaries (
  name text not null,
  polygon postgis.geometry not null,
  level numeric not null
);
