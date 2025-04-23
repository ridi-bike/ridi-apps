use std::num::ParseIntError;

use postgres::Client;
use wkt::ToWkt;

use crate::{db::queries::geo_boundaries_upsert, pbf_reader::Boundary};
use geo::{Contains, Coord, LineString, Polygon};
use geo_types::MultiPolygon;

fn match_holes_to_outer_polygons(
    outer_polygons: &[LineString<f64>],
    inner_polygons: &[LineString<f64>],
) -> MultiPolygon<f64> {
    let mut matched_polygons = Vec::new();

    // For each outer polygon
    for outer in outer_polygons {
        let outer_polygon = Polygon::new(outer.clone(), vec![]);
        let mut matching_holes = Vec::new();

        // Find all inner polygons (holes) that are contained within this outer polygon
        for inner in inner_polygons {
            // Create a point from the first coordinate of the inner ring
            if let Some(point) = inner.points().next() {
                // Check if the outer polygon contains this point from the inner ring
                if outer_polygon.contains(&point) {
                    matching_holes.push(inner.clone());
                }
            }
        }

        // Create a polygon with the outer ring and all matching holes
        let polygon = Polygon::new(outer.clone(), matching_holes);
        matched_polygons.push(polygon);
    }

    MultiPolygon::new(matched_polygons)
}

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
    let multi_polygon = match_holes_to_outer_polygons(
        &boundary
            .polygons_outer
            .iter()
            .map(|line| {
                LineString::new(
                    line.iter()
                        .map(|(lat, lon)| Coord { x: *lon, y: *lat })
                        .collect(),
                )
            })
            .collect::<Vec<_>>()[..],
        &boundary
            .polygons_inner
            .iter()
            .map(|line| {
                LineString::new(
                    line.iter()
                        .map(|(lat, lon)| Coord { x: *lon, y: *lat })
                        .collect(),
                )
            })
            .collect::<Vec<_>>()[..],
    );
    let wkt_string = multi_polygon.to_wkt().to_string();

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
        wkt_string,
    )
    .map_err(|error| GeoBoundariesError::DbError {
        error,
        boundary_id: boundary.id,
    })?;

    Ok(())
}
