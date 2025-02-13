alter table rule_sets
  add column default_set boolean not null default false;

update rule_sets
set default_set = true
where name = 'All roads' and user_id is null;
