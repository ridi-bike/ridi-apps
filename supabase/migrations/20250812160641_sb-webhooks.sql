create table if not exists private.webhooks (
  url text not null,
  secret text not null
);

create extension if not exists pg_net with schema net;

create or replace function public.sync_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_headers jsonb;
  v_body jsonb;
begin
  select w.url, w.secret
    into v_url, v_secret
  from private.webhooks as w
  limit 1;

  if v_url is null or v_secret is null then
    raise exception 'private.webhooks must contain one row with url and secret';
  end if;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json'
  );

  v_body := jsonb_build_object(
    'type', TG_OP,
    'schema', TG_TABLE_SCHEMA,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(NEW),
    'old_record', to_jsonb(OLD)
  );

  perform net.http_post(
    url := v_url || '?token=' || v_secret,
    headers := v_headers,
    body := v_body,
    timeout_milliseconds := 1000
  );

  return NEW;
end;
$$;

drop trigger if exists "sync_regions" on "public"."regions";

create trigger "sync_regions"
after insert on "public"."regions"
for each row
execute function public.sync_data();

drop trigger if exists "sync_plans" on "public"."plans";

create trigger "sync_plans"
after insert on "public"."plans"
for each row
execute function public.sync_data();

drop trigger if exists "sync_routes" on "public"."routes";

create trigger "sync_routes"
after insert on "public"."routes"
for each row
execute function public.sync_data();

drop trigger if exists "sync_route_breakdown_stats" on "public"."route_breakdown_stats";

create trigger "sync_route_breakdown_stats"
after insert on "public"."route_breakdown_stats"
for each row
execute function public.sync_data();

drop trigger if exists "sync_rule_sets" on "public"."rule_sets";

create trigger "sync_rule_sets"
after insert on "public"."rule_sets"
for each row
execute function public.sync_data();

drop trigger if exists "sync_rule_set_road_tags" on "public"."rule_set_road_tags";

create trigger "sync_rule_set_road_tags"
after insert on "public"."rule_set_road_tags"
for each row
execute function public.sync_data();
