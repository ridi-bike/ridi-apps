use std::{collections::HashMap, fmt::Display, io, path::PathBuf, time::Instant};

use osmpbfreader::{Node, OsmObj, Relation, Way};
use tracing::{error, info, trace};

#[derive(Debug, thiserror::Error)]
pub enum PbfReaderError {
    #[error("File open error: {error}")]
    PbfFileOpenError { error: io::Error },

    #[error("File read error: {error}")]
    PbfFileReadError { error: osmpbfreader::Error },

    #[error("Name not found for relation {id}")]
    NameNotFound { id: i64 },

    #[error("Level not found for relation {id}")]
    LevelNotFound { id: i64 },
}

#[derive(Debug)]
pub struct Boundary {
    pub id: i64,
    pub name: String,
    pub polygons_outer: Vec<Vec<(f64, f64)>>,
    pub polygons_inner: Vec<Vec<(f64, f64)>>,
    pub level: String,
}

pub struct PbfReader {
    nodes: HashMap<i64, Node>,
    ways: HashMap<i64, Way>,
    relations: Vec<Relation>,
}

#[derive(Clone, Debug)]
struct WayWithPoints {
    points: Vec<(f64, f64)>,
}

impl PbfReader {
    fn get_boundary_from_relation(&self, relation: &Relation, role: &str) -> Vec<Vec<(f64, f64)>> {
        let mut boundaries: Vec<Vec<(f64, f64)>> = Vec::new();
        let mut current_boundary: Vec<(f64, f64)> = Vec::new();

        let mut ways_with_points: Vec<WayWithPoints> = Vec::new();

        for relation_ref in relation
            .refs
            .iter()
            .filter(|relation_ref| relation_ref.role == role)
        {
            let way_id = match relation_ref.member.way() {
                None => {
                    error!(relation_id = ?relation_ref, "Not a way");
                    continue;
                }
                Some(w_id) => w_id,
            };

            let way = match self.ways.get(&way_id.0) {
                None => {
                    continue;
                }
                Some(w) => w,
            };

            ways_with_points.push(WayWithPoints {
                points: way
                    .nodes
                    .iter()
                    .filter_map(|node_id| self.nodes.get(&node_id.0))
                    .map(|node| (node.lat(), node.lon()))
                    .collect(),
            });
        }
        trace!(
            ways_with_points = ?ways_with_points,
            "Prep done"
        );

        while !ways_with_points.is_empty() {
            trace!(
                ways_with_points_len = ways_with_points.len(),
                current_boundary_len = current_boundary.len(),
                "Loop start"
            );
            if current_boundary.len() == 0 {
                if let Some(way) = ways_with_points.pop() {
                    way.points
                        .iter()
                        .for_each(|p| current_boundary.push((p.0, p.1)));
                }
            } else if let Some(last_point) = current_boundary.last() {
                trace!(last_point = ?last_point, "Checking last point");
                let next_way = ways_with_points
                    .iter()
                    .enumerate()
                    .find(|(_i, w)| {
                        if let Some(p) = w.points.last() {
                            if p.0 == last_point.0 && p.1 == last_point.1 {
                                return true;
                            }
                        }
                        if let Some(p) = w.points.first() {
                            if p.0 == last_point.0 && p.1 == last_point.1 {
                                return true;
                            }
                        }
                        false
                    })
                    .map(|w| (w.0, w.1.clone()));
                trace!(next_way = ?next_way, "Next way");
                if let Some((idx, next_way)) = next_way {
                    ways_with_points.remove(idx);
                    if let Some(next_way_first_point) = next_way.points.first() {
                        trace!(next_way_first_point = ?next_way_first_point, "First point match");
                        if next_way_first_point == last_point {
                            next_way
                                .points
                                .iter()
                                .for_each(|p| current_boundary.push((p.0, p.1)));
                        } else {
                            trace!("Last point match");
                            next_way
                                .points
                                .iter()
                                .rev()
                                .for_each(|p| current_boundary.push((p.0, p.1)));
                        }
                    }
                } else {
                    trace!("Should be a full circle");
                    if current_boundary.len() > 1 {
                        if let Some(first_point) = current_boundary.first() {
                            if let Some(last_point) = current_boundary.last() {
                                if first_point == last_point {
                                    trace!("Adding boundary");
                                    boundaries.push(current_boundary);
                                }
                                current_boundary = Vec::new();
                            }
                        }
                    }
                }
            }
        }

        if current_boundary.len() > 1 {
            if let Some(first_point) = current_boundary.first() {
                if let Some(last_point) = current_boundary.last() {
                    if first_point == last_point {
                        trace!("Adding boundary");
                        boundaries.push(current_boundary);
                    }
                }
            }
        }

        boundaries
    }

    pub fn pbf_get_boundaries(file: &PathBuf) -> Result<Vec<Boundary>, PbfReaderError> {
        info!("Reading PBF");

        let mut reader = PbfReader {
            nodes: HashMap::new(),
            ways: HashMap::new(),
            relations: Vec::new(),
        };

        let read_start = Instant::now();

        let path = std::path::Path::new(&file);
        let r = std::fs::File::open(path)
            .map_err(|error| PbfReaderError::PbfFileOpenError { error })?;
        let mut pbf = osmpbfreader::OsmPbfReader::new(r);

        pbf.get_objs_and_deps(|obj| {
            obj.is_relation()
                && obj.tags().contains("type", "boundary")
                && obj.tags().contains("boundary", "administrative")
                && obj.tags().contains_key("admin_level")
                && obj.tags().contains_key("name")
        })
        .map_err(|error| PbfReaderError::PbfFileReadError { error })?
        .into_iter()
        .for_each(|(_id, element)| {
            if element.is_relation()
                && element.tags().contains("type", "boundary")
                && element.tags().contains("boundary", "administrative")
                && element.tags().contains_key("admin_level")
                && element.tags().contains_key("name")
            {
                let relation = element.relation().expect("Must be a way");
                reader.relations.push(relation.clone());
            } else if element.is_way() {
                let way = element.way().expect("Must be a way");
                reader.ways.insert(element.id().inner_id(), way.clone());
            } else if element.is_node() {
                let node = element.node().expect("Must be a node");
                reader.nodes.insert(element.id().inner_id(), node.clone());
            }
        });

        let boundaries: Vec<Boundary> = reader
            .relations
            .iter()
            .map(|relation| {
                let name = relation
                    .tags
                    .iter()
                    .find(|tag| tag.0 == "name:en")
                    .map(|t| t.1);

                let name = match name {
                    Some(n) => n,
                    None => relation
                        .tags
                        .iter()
                        .find(|tag| tag.0 == "name")
                        .map(|t| t.1)
                        .ok_or(PbfReaderError::NameNotFound { id: relation.id.0 })?,
                };
                let level = match relation
                    .tags
                    .iter()
                    .find(|tag| tag.0 == "admin_level")
                    .map(|t| t.1)
                {
                    None => return Err(PbfReaderError::LevelNotFound { id: relation.id.0 }),
                    Some(n) => n,
                };
                let border_outer_points = reader.get_boundary_from_relation(relation, "outer");
                let border_inner_points = reader.get_boundary_from_relation(relation, "inner");

                Ok(Boundary {
                    id: relation.id.0,
                    name: name.to_string(),
                    level: level.to_string(),
                    polygons_outer: border_outer_points,
                    polygons_inner: border_inner_points,
                })
            })
            .collect::<Result<Vec<_>, PbfReaderError>>()?;

        let read_duration = read_start.elapsed();
        trace!("file read took {} seconds", read_duration.as_secs());

        Ok(boundaries)
    }
}
