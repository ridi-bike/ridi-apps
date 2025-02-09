
alter table public.route_breakdown_stats enable row level security;
create policy "select only on user_id"
on public.route_breakdown_stats
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));

alter table public.rule_set_road_tags enable row level security;
create policy "select only on user_id"
on public.rule_set_road_tags
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));

alter table public.rule_sets enable row level security;
create policy "select only on user_id"
on public.rule_sets
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));
