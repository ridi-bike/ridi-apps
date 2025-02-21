drop table public.regions;

create table public.regions (
  region text not null primary key,
  geojson jsonb not null,
  polygon postgis.geometry null
);

alter table public.rule_sets
  add column is_deleted boolean;

alter table public.plans
  add constraint fk_plans_rule_set_id foreign key (rule_set_id) 
          references rule_sets (id);
