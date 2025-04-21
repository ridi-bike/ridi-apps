use std::num::ParseIntError;

use postgres::Client;

use crate::{db::queries::geo_boundaries_upsert, pbf_reader::Boundary};

#[derive(Debug, thiserror::Error)]
pub enum GeoBoundariesError {
    #[error("Level string is not an int: {error}, level: {level}, boundary: {boundary_id}")]
    LevelNotAnInt {
        error: ParseIntError,
        level: String,
        boundary_id: i64,
    },
    #[error("Db returned an error: {error}, boundary: {boundary_id}")]
    DbError {
        error: postgres::Error,
        boundary_id: i64,
    },
}

pub fn boundary_insert(
    db_client: &mut Client,
    boundary: &Boundary,
) -> Result<(), GeoBoundariesError> {
    let mut polygon = String::new();
    polygon.push_str("MULTIPOLYGON(");

    polygon.push_str("(");
    for outer in boundary.polygons_outer.clone() {
        if outer.len() > 2 {
            polygon.push_str("(");
            for coords in outer.clone() {
                polygon.push_str(format!("{:.5} {:.5}, ", coords.1, coords.0).as_str());
            }
            polygon.push_str(format!("{:.5} {:.5}", outer[0].1, outer[0].0).as_str());
            polygon.push_str("), ");
        }
    }
    polygon.pop();
    polygon.pop();
    polygon.push_str("),");

    for inner in boundary.polygons_inner.clone() {
        if inner.len() > 2 {
            polygon.push_str("(");
            for coords in inner.clone() {
                polygon.push_str(format!("{:.5} {:.5}, ", coords.1, coords.0).as_str());
            }
            polygon.push_str(format!("{:.5} {:.5}", inner[0].1, inner[0].0).as_str());
            polygon.push_str("), ");
        }
    }
    polygon.pop();
    polygon.pop();
    polygon.push_str(")");

    polygon.push_str(")");

    let level =
        boundary
            .level
            .parse::<i16>()
            .map_err(|error| GeoBoundariesError::LevelNotAnInt {
                error,
                level: boundary.level.clone(),
                boundary_id: boundary.id,
            })?;

    let _ = geo_boundaries_upsert(
        db_client,
        boundary.id,
        boundary.name.clone(),
        level,
        polygon,
    )
    .map_err(|error| GeoBoundariesError::DbError {
        error,
        boundary_id: boundary.id,
    })?;

    Ok(())
}
