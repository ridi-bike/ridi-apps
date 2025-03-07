alter table plans
  add column is_deleted boolean not null default false;

alter table routes
  add column is_deleted boolean not null default false;
