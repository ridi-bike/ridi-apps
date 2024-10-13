create type route_request_status as enum ('new', 'processing', 'done');

create table public.route_request (
	id text not null default gen_random_ksuid_second() primary key,
	user_id uuid not null reference auth.users.id,
	created_at timestamp not null default now(),
	modified_at timestamp,
	from_lat number not null,
	from_lon number not null,
	to_lat number not null,
	to_lon number not null,
	status route_request_status not null,

)

alter policy "Enable insert for users based on user_id"
on "public"."realtime_tests"
to public
using (
  ( SELECT auth.uid() AS uid) = user_id
	AND 
)
with check (
  ( SELECT auth.uid() AS uid) = user_id
	and
	( 'new' = user_id )
);
