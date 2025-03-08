drop schema ridi_services cascade;

select pgmq.drop_queue('net-addr-activity');
select pgmq.drop_queue('coords-activty');

create schema private;

create type private.stripe_status as enum ('none', 'initiated', 'succeeded', 'confirmed');

create table private.stripe_users (
	user_id uuid not null primary key references auth.users on delete cascade on update cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status private.stripe_status not null default 'none'
)
