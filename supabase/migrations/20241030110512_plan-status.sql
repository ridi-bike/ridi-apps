alter type plan_status rename value 'created' TO 'done';
alter type plan_status rename to plan_state;

alter table public.plans rename column status to state;
