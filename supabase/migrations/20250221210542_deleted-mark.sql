alter table rule_sets
  alter column is_deleted set default false;

update rule_sets
set is_deleted = false
where is_deleted is null;

alter table rule_sets
  alter column is_deleted set not null;
