
insert into rule_sets (name) 
values ('All roads');


insert into rule_set_road_tags (
  rule_set_id,
  tag_key,
  value
)
select id, tag, 0 from rule_sets, unnest(array[
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'unclassified',
  'residential',
  'living_street',
  'track',
  'path',
  'paved',
  'asphalt',
  'chipseal',
  'concrete',
  'concrete:lanes',
  'concrete:plates',
  'paving_stones',
  'paving_stones:lanes',
  'grass_paver',
  'sett',
  'unhewn_cobblestone',
  'cobblestone',
  'bricks',
  'unpaved',
  'compacted',
  'fine_gravel',
  'gravel',
  'shells',
  'rock',
  'pebblestone',
  'ground',
  'dirt',
  'earth',
  'grass',
  'mud',
  'sand',
  'woodchips',
  'snow',
  'ice',
  'salt',
  'metal',
  'metal_grid',
  'wood',
  'stepping_stones',
  'rubber',
  'tiles',
  'excellent',
  'good',
  'intermediate',
  'bad',
  'very_bad',
  'horrible',
  'very_horrible',
  'impassable'
]) tag
where rule_sets.name = 'All roads';

