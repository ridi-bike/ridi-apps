create type rule_set_icon as enum ('touring', 'dualsport', 'adv');

alter table rule_sets
  add column icon rule_set_icon;

update rule_sets
set icon = 'adv',
  name = 'All surfaces'
where name = 'All roads';

update rule_set_road_tags
set value = 255
where rule_set_id = (
  select id from rule_sets
  where name = 'All surfaces'
);

update rule_set_road_tags
set value = 0
where rule_set_id = (
  select id from rule_sets
  where name = 'All surfaces'
)
and (
  tag_key = 'residential' 
  or tag_key = 'living_street'
  or tag_key = 'motorway'
  or tag_key = 'trunk'
);

update rule_set_road_tags
set value = null
where rule_set_id = (
  select id from rule_sets
  where name = 'All surfaces'
)
and (tag_key = 'track' or tag_key = 'trail');

update rule_sets
set icon = 'dualsport'
where name = 'Prefer Unpaved';

update rule_sets
set icon = 'touring'
where name = 'Only Paved';

update rule_set_road_tags
set value = 255
where rule_set_id = (
  select id from rule_sets
  where name = 'Only Paved'
)
and (tag_key = 'primary' or tag_key = 'secondary');
