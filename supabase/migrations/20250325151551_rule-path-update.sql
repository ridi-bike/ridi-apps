
update rule_set_road_tags
set value = null
where rule_set_id = (
  select id from rule_sets
  where name = 'All surfaces'
)
and (tag_key = 'track' or tag_key = 'path');
