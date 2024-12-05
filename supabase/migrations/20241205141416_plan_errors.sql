alter table public.plans
	add column error text;

alter type plan_state add value 'error';

alter table public.regions
	drop column polygon;

alter table public.regions
	add column polygon postgis.geometry(POLYGON);
