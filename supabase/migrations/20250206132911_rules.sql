
create table rule_packs (
	id text not null default ksuid() primary key,
	user_id uuid references auth.users on delete cascade on update cascade,
  name text not null
);

insert into rule_packs (name) 
values 
('Only Paved'), 
('Prefer unpaved');

create policy "select only on user_id match or user_id null"
on public.rule_packs
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id or user_id is null));

create table rule_pack_road_tags (
	user_id uuid references auth.users on delete cascade on update cascade,
  rule_set_id text not null references public.rule_packs on delete cascade on update cascade,
  tag_key text not null,
  value smallint,
  primary key (rule_set_id, tag_key)
);

insert into rule_pack_road_tags (
  rule_set_id,
  tag_key,
  value
)
select id, tag, 0 from rule_packs, unnest(array[
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

create policy "select only on user_id match or user_id null"
on public.rule_pack_road_tags
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id or user_id is null));

alter table plans
  add column rule_set_id text not null references rule_packs;
