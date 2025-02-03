truncate table plans cascade;

create type plan_type as enum ('round-trip', 'start-finish');

alter table plans
  rename column from_lat to start_lat;
alter table plans
  rename column from_lon to start_lon;
alter table plans
  rename column to_lat to finish_lat;
alter table plans
  rename column to_lon to finish_lon;
alter table plans
  add column trip_type plan_type not null;
alter table plans
  alter column finish_lon drop not null;
alter table plans
  alter column finish_lat drop not null;
alter table plans
  add column distance numeric not null;
alter table plans
  add column bearing numeric;
alter table plans
  add column start_desc text not null;
alter table plans
  add column finish_desc text;


