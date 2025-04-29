alter table public.geo_boundaries enable row level security;

create policy "Enable read access for all users"
on "public"."geo_boundaries"
as permissive
for select
to public
using (
  true
);
