CREATE SCHEMA ridi_services;

-- Enum types for version and status
CREATE TYPE ridi_services.map_version AS ENUM ('current', 'previous', 'next', 'discarded');
CREATE TYPE ridi_services.map_status AS ENUM ('new', 'downloaded', 'processing', 'ready', 'error');
CREATE TYPE ridi_services.service_status AS ENUM ('triggered', 'processing', 'done');
CREATE TYPE ridi_services.service_name AS ENUM ('map-data', 'router', 'deploy');

-- Map data table
CREATE TABLE ridi_services.map_data (
    id TEXT PRIMARY KEY DEFAULT ksuid(),
    region TEXT NOT NULL,
    version ridi_services.map_version NOT NULL,
    status ridi_services.map_status NOT NULL,
    pbf_location TEXT NOT NULL,
    pbf_md5 TEXT NOT NULL,
    cache_location TEXT NOT NULL,
    router_version TEXT NOT NULL,
    kml_location TEXT NOT NULL,
    error TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    pbf_size BIGINT,
    pbf_downloaded_size BIGINT,
    cache_size BIGINT,
    startup_time_s BIGINT
);

CREATE TABLE ridi_services.services (
    name ridi_services.service_name PRIMARY KEY,
    router_version TEXT NOT NULL,
    status ridi_services.service_status NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);
