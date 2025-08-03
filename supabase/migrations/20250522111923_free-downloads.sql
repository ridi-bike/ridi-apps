alter table private.users
  add column download_count_remain smallint not null default 5;

alter table public.routes
  add column downloaded_at timestamp;

update routes
set downloaded_at = now()
where id in (
'2vrLsg4L21UJSCyqIcMCHBjFBim',
'2vrLrfhwWlTRo6Ync7F3lLegy0a',
'2wqjOWPT8FlYrob8ixDwlGCftCP',
'2wqjOWPT8FlYrob8ixDwlGCftCP',
'2xGVOm2nikU7qK015IGwr58mSZc',
'2wQLK1hOYXBui5gG0vHBYjLNSoY'
);
