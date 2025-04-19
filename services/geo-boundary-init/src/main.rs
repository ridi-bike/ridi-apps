use std::io;

use tracing::Level;

mod db;
mod pbf_reader;

fn main() {
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_writer(io::stderr)
        .with_file(true)
        .with_line_number(true)
        .with_thread_names(true)
        .with_max_level(Level::INFO)
        .finish();

    tracing::subscriber::set_global_default(subscriber);
}
