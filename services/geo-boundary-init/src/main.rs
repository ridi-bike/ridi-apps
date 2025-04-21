use std::{io, path::PathBuf, process};

use env::{Env, RidiEnv};
use geo_boundaries::boundary_insert;
use postgres::NoTls;
use tracing::{error, trace, Level};

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
            .with_file(true)
            .with_line_number(true)
            .with_thread_names(true)
            .with_max_level(Level::TRACE)
            .finish();

        tracing::subscriber::set_global_default(subscriber)
    } else {
        let subscriber = tracing_subscriber::fmt()
            .with_writer(io::stderr)
            .with_file(true)
            .with_line_number(true)
            .with_thread_names(true)
            .with_max_level(Level::INFO)
            .finish();
        tracing::subscriber::set_global_default(subscriber)
    };

    if let Err(e) = subscriber {
        error!(error = ?e, "Failed to set up tracing");
        process::exit(1);
    }

    let mut db_client = match postgres::Client::connect(&env.supabase_db_url, NoTls) {
        Err(e) => {
            error!(error = ?e, "Failed to connect to db");
            process::exit(1);
        }
        Ok(con) => con,
    };

    let boundaries =
        match pbf_reader::PbfReader::pbf_get_boundaries(&PathBuf::from(env.pbf_location)) {
            Err(e) => {
                error!(error = ?e, "Failed to read boundaries");
                process::exit(1);
            }
            Ok(b) => b,
        };

    trace!(boundaries = ?boundaries.len(), "boundaries found");

    for boundary in boundaries {
        match boundary_insert(&mut db_client, &boundary) {
            Err(e) => {
                error!(error = ?e, "Failed to insert boundaries");
            }
            Ok(o) => o,
        };
    }
}
