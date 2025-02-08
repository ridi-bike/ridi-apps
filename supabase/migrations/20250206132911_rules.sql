
create table rule_sets (
	id text not null default ksuid() primary key,
	user_id uuid references auth.users on delete cascade on update cascade,
  name text not null
);

insert into rule_sets (name) 
values 
('Only Paved'),
('Prefer Unpaved');

create policy "select only on user_id match or user_id null"
on public.rule_sets
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id or user_id is null));

create table rule_set_road_tags (
	user_id uuid references auth.users on delete cascade on update cascade,
  rule_set_id text not null references public.rule_sets on delete cascade on update cascade,
  tag_key text not null,
  value smallint,
  primary key (rule_set_id, tag_key)
);

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
]) tag;

update rule_set_road_tags
set value = 255
where tag_key in (
  'tertiary',
  'unclassified'
)
and rule_set_id = (
  select id from rule_sets
  where name = 'Only Paved' 
);

update rule_set_road_tags
set value = null
where tag_key in (
  'track',
  'path',
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
  'tiles'
)
and rule_set_id = (
  select id from rule_sets
  where name = 'Only Paved' 
);

update rule_set_road_tags
set value = 255
where tag_key in (
  'tertiary',
  'unclassified',
  'track',
  'path',
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
  'sand'
)
and rule_set_id = (
  select id from rule_sets
  where name = 'Prefer Unpaved' 
);

create policy "select only on user_id match or user_id null"
on public.rule_set_road_tags
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id or user_id is null));

alter table plans
  add column rule_set_id text not null;

alter publication supabase_realtime add table public.rule_sets;
alter publication supabase_realtime add table public.rule_set_road_tags;
