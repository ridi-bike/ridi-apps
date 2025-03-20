alter table private.stripe_users
  rename to users;

create type private.user_sub_type as enum ('none', 'stripe', 'code');

alter table private.users
  add column sub_type private.user_sub_type not null default 'none';

alter table private.users
  rename column flow_status to stripe_flow_status;

alter table private.users
  alter column stripe_customer_id drop not null;

create or replace function user_private_insert()
returns trigger
security definer
as $$
begin
    insert into private.users (user_id)
    values (new.id);
    return new;
end;
$$ language plpgsql;

create trigger auth_users_insert_after
after insert on auth.users
for each row
execute function user_private_insert();

create table private.codes (
	id text not null default ksuid() primary key,
  code text not null,
  created_at timestamp not null,
  claimed_at timestamp,
  claimed_by_user_id uuid references auth.users on delete cascade on update cascade
);
