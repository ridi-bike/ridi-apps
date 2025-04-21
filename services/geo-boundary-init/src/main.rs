use std::{io, path::PathBuf, process};

use tracing::{error, trace, Level};

mod db;
mod pbf_reader;

fn main() {
    let subscriber = tracing_subscriber::fmt()
        // .json()
        .with_writer(io::stderr)
        .with_file(true)
        .with_line_number(true)
        .with_thread_names(true)
        .with_max_level(Level::TRACE)
        .finish();

    match tracing::subscriber::set_global_default(subscriber) {
        Err(e) => {
            error!(error = ?e, "Failed to set up tracing");
            process::exit(1);
        }
        Ok(_) => {}
    };

    let boundaries = match pbf_reader::PbfReader::pbf_get_boundaries(&PathBuf::from(
        "../.ridi-data/map-data/estonia/map.osm.pbf",
    )) {
        Err(e) => {
            error!(error = ?e, "Failed to read boundaries");
            process::exit(1);
        }
        Ok(b) => b,
    };

    trace!(boundaries = ?boundaries.len(), "boundaries found");
}
