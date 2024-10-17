create type track_request_status as enum ('new', 'processing', 'done');

create table public.track_requests (
	id text not null default ksuid() primary key,
	user_id uuid not null references auth.users on delete cascade on update cascade,
	created_at timestamp not null default now(),
	modified_at timestamp,
	from_lat numeric not null,
	from_lon numeric not null,
	to_lat numeric not null,
	to_lon numeric not null,
	status track_request_status not null default 'new',
	name text not null
);

alter table "public"."track_requests" enable row level security;

create policy "select only on user_id"
on "public"."track_requests"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));

alter publication supabase_realtime add table public.track_requests;

create table public.tracks (
	id text not null default ksuid() primary key,
	user_id uuid not null references auth.users on delete cascade on update cascade,
	created_at timestamp not null default now(),
	track_request_id text not null references public.track_requests on delete cascade on update cascade,
	name text not null
);

alter table public.tracks enable row level security;

create policy "select only on user_id"
on "public"."tracks"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));

alter publication supabase_realtime add table public.tracks;
