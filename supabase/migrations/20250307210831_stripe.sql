drop schema ridi_services cascade;

select pgmq.drop_queue('net-addr-activity');
select pgmq.drop_queue('coords-activty');

create schema private;

create type private.stripe_status as enum ('none', 'initiated', 'completed', 'confirmed');

create table private.stripe_users (
	user_id uuid not null primary key references auth.users on delete cascade on update cascade,
  flow_status private.stripe_status not null default 'none',
  stripe_customer_id text not null unique,
  stripe_status text,
  stripe_checkout_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  stripe_current_period_end timestamp,
  stripe_current_period_start timestamp,
  stripe_cancel_at_period_end boolean,
  stripe_payment_method text
)
