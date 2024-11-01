create table route_points (
	id text not null default ksuid() primary key,
	user_id uuid not null references auth.users on delete cascade on update cascade,
	route_id text not null references public.routes on delete cascade on update cascade,
	order_in_route numeric not null,
	lat numeric not null,
	lon numeric not null
);


alter table public.route_points enable row level security;

create policy "select only on user_id"
on public.route_points
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));
