create table geo_boundaries (
  id bigint not null primary key,
  name text not null,
  polygon postgis.geometry not null,
  level smallint not null,
  updated_at timestamp not null
);
