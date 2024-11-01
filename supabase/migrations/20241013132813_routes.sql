create type plan_status as enum ('new', 'planning', 'created');

create table public.plans (
	id text not null default ksuid() primary key,
	user_id uuid not null references auth.users on delete cascade on update cascade,
	created_at timestamp not null default now(),
	modified_at timestamp,
	from_lat numeric not null,
	from_lon numeric not null,
	to_lat numeric not null,
	to_lon numeric not null,
	status plan_status not null default 'new',
	name text not null
);

alter table public.plans enable row level security;

create policy "select only on user_id"
on public.plans
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));

alter publication supabase_realtime add table public.plans;

create table public.routes (
	id text not null default ksuid() primary key,
	user_id uuid not null references auth.users on delete cascade on update cascade,
	created_at timestamp not null default now(),
	plan_id text not null references public.plans on delete cascade on update cascade,
	name text not null
);

alter table public.routes enable row level security;

create policy "select only on user_id"
on public.routes
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));

alter publication supabase_realtime add table public.routes;
