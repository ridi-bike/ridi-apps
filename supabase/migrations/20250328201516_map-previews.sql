alter table public.plans 
  add column map_preview_light text,
  add column map_preview_dark text;

alter table public.routes
  add column map_preview_light text,
  add column map_preview_dark text;
