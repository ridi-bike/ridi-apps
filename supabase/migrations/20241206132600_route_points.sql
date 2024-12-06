drop table route_points;
truncate table routes;
alter table routes
	add column linestring postgis.geometry(LINESTRING);

