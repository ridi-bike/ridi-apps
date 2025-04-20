use std::{io, path::PathBuf, time::Instant};

use tracing::trace;

pub enum PbfReaderError {
    PbfFileOpenError { error: io::Error },
    PbfFileReadError { error: osmpbfreader::Error },
    NotARelation,
    NameNotFound,
    LevelNotFound,
}

pub struct Boundary {
    id: i64,
    name: String,
    polygon: Vec<(f64, f64)>,
    level: String,
}

pub fn pbf_get_boundaries(file: &PathBuf) -> Result<Vec<Boundary>, PbfReaderError> {
    let read_start = Instant::now();

    let path = std::path::Path::new(&file);
    let r =
        std::fs::File::open(path).map_err(|error| PbfReaderError::PbfFileOpenError { error })?;
    let mut pbf = osmpbfreader::OsmPbfReader::new(r);

    let boundaries = pbf
        .get_objs_and_deps(|obj| {
            obj.is_relation()
                && obj
                    .tags()
                    .iter()
                    .any(|t| t.0 == "boundary" && t.1 == "administrative")
        })
        .map_err(|error| PbfReaderError::PbfFileReadError { error })?
        .iter()
        .map(|(id, rel)| {
            if !rel.is_relation() {
                return Err(PbfReaderError::NotARelation);
            }
            let tags_iter = rel.tags().iter();
            let name = match tags_iter.find(|tag| tag.0 == "name").map(|t| t.1) {
                None => return Err(PbfReaderError::NameNotFound),
                Some(n) => n,
            };
            let level = match tags_iter.find(|tag| tag.0 == "name").map(|t| t.1) {
                None => return Err(PbfReaderError::LevelNotFound),
                Some(n) => n,
            };
            Ok(Boundary {
                id: id.inner_id(),
                name: name.to_string(),
                level: level.to_string(),
                polygon,
            })
        })
        .collect::<Result<Vec<_>, PbfReaderError>>()?;

    let read_duration = read_start.elapsed();
    trace!("file read took {} seconds", read_duration.as_secs());

    Ok(boundaries)
}
