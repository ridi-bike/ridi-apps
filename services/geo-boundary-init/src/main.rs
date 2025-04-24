use std::{io, path::PathBuf, process, thread::sleep, time::Duration};

use env::{Env, RidiEnv};
use geo_boundaries::boundary_insert;
use postgres::NoTls;
use tracing::{error, info, info_span, warn, Level};

mod db;
mod env;
mod geo_boundaries;
mod pbf_reader;

fn main() {
    let env = Env::init();

    let subscriber = if env.env == RidiEnv::Prod {
        let subscriber = tracing_subscriber::fmt()
            .json()
            .with_writer(io::stderr)
            .with_max_level(Level::INFO)
            .finish();

        tracing::subscriber::set_global_default(subscriber)
    } else {
        let subscriber = tracing_subscriber::fmt()
            .with_writer(io::stderr)
            .with_max_level(Level::INFO)
            .finish();
        tracing::subscriber::set_global_default(subscriber)
    };

    let _span = info_span!(
        "Geo boundaries main",
        service = "geo-boundaries-init",
        region = env.region,
        pbf_location = env.pbf_location,
    )
    .entered();

    info!("Starting");

    if let Err(e) = subscriber {
        eprintln!("Failed to set up tracing: {e:?}");
        process::exit(1);
    }

    let mut connection_attempt = 0;
    let mut db_client = loop {
        connection_attempt += 1;

        info!(connection_attempt = connection_attempt, "Connecting to db");
        match postgres::Client::connect(&env.supabase_db_url, NoTls) {
            Err(e) => {
                if connection_attempt < 11 {
                    warn!(error = ?e, connection_attempt = connection_attempt, "Failed to connect to db");
                    sleep(Duration::from_millis(connection_attempt * 1000));
                } else {
                    error!(error = ?e, "Failed to connect to db");
                    process::exit(1);
                }
            }
            Ok(con) => break con,
        };
    };

    let boundaries =
        match pbf_reader::PbfReader::pbf_get_boundaries(&PathBuf::from(env.pbf_location)) {
            Err(e) => {
                error!(error = ?e, "Failed to read boundaries");
                process::exit(1);
            }
            Ok(b) => b,
        };

    info!(boundaries_len = boundaries.len(), "Boundaries found");

    for boundary in boundaries {
        match boundary_insert(&mut db_client, &boundary) {
            Err(e) => {
                error!(error = ?e, "Failed to insert boundaries");
            }
            Ok(o) => o,
        };
    }

    info!("Done");
}
