
alter table public.regions enable row level security;

create policy "Enable read access for all authed users"
on "public"."regions"
as PERMISSIVE
for SELECT
to authenticated
using (
  true
);

alter table public.plans
  add column region text;
