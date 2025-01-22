truncate table regions;

create unique index
on regions (region, pbf_md5, version);
