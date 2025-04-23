create index geo_boundaries_boundaries
  on geo_boundaries
  using gist (polygon);
