
alter table regions
  add column id text unique not null default ksuid();

SELECT pgmq.create('data_sync_notify');

create or replace function public.data_sync_notify_send()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA
  );

  if TG_OP = 'INSERT' then
    payload := payload || jsonb_build_object(
      'record', to_jsonb(NEW),
      'old_record', 'null'::jsonb
    );
  elsif TG_OP = 'UPDATE' then
    payload := payload || jsonb_build_object(
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    );
  elsif TG_OP = 'DELETE' then
    payload := payload || jsonb_build_object(
      'record', 'null'::jsonb,
      'old_record', to_jsonb(OLD)
    );
  end if;

	perform pgmq.send(
		queue_name => 'data_sync_notify',
		msg        => payload,
		delay      => 2
	);
  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

drop trigger if exists tr_data_sync_notify_plans on public.plans;
drop trigger if exists tr_data_sync_notify_regions on public.regions;
drop trigger if exists tr_data_sync_notify_route_breakdown_stats on public.route_breakdown_stats;
drop trigger if exists tr_data_sync_notify_routes on public.routes;
drop trigger if exists tr_data_sync_notify_rule_sets on public.rule_sets;
drop trigger if exists tr_data_sync_notify_rule_set_road_tags on public.rule_set_road_tags;

create trigger tr_data_sync_notify_plans
after insert or update or delete on public.plans
for each row
execute function public.data_sync_notify_send();

create trigger tr_data_sync_notify_regions
after insert or update or delete on public.regions
for each row
execute function public.data_sync_notify_send();

create trigger tr_data_sync_notify_route_breakdown_stats
after insert or update or delete on public.route_breakdown_stats
for each row
execute function public.data_sync_notify_send();

create trigger tr_data_sync_notify_routes
after insert or update or delete on public.routes
for each row
execute function public.data_sync_notify_send();

create trigger tr_data_sync_notify_rule_sets
after insert or update or delete on public.rule_sets
for each row
execute function public.data_sync_notify_send();

create trigger tr_data_sync_notify_rule_set_road_tags
after insert or update or delete on public.rule_set_road_tags
for each row
execute function public.data_sync_notify_send();

create table private.sync_tokens (
	id text not null default ksuid() primary key,
	user_id uuid not null references auth.users on delete cascade on update cascade,
	created_at timestamp not null default now()
);
