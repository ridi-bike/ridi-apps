alter table ridi_services.map_data
    add column next_download_after timestamp not null default now() + interval '14 days';
