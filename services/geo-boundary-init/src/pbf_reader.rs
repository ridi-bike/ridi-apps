use std::{collections::HashMap, fmt::Display, io, path::PathBuf, time::Instant};

use osmpbfreader::{OsmObj, Relation};
use tracing::trace;

#[derive(Debug, thiserror::Error)]
pub enum PbfReaderError {
    #[error("File open error: {error}")]
    PbfFileOpenError { error: io::Error },

    #[error("File read error: {error}")]
    PbfFileReadError { error: osmpbfreader::Error },

    #[error("Not a relation")]
    NotARelation,

    #[error("Not a node")]
    NotANode,

    #[error("Not a way")]
    NotAWay,

    #[error("Name not found for relation {id}")]
    NameNotFound { id: i64 },

    #[error("Level not found for relation {id}")]
    LevelNotFound { id: i64 },

    #[error("Way not found")]
    WayNotFound,

    #[error("Node not found")]
    NodeNotFound,
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
    nodes: HashMap<i64, OsmObj>,
    ways: HashMap<i64, OsmObj>,
    relations: Vec<OsmObj>,
}

impl PbfReader {
    fn get_boundary_from_relation(&self, relation: &Relation, role: &str) -> Vec<Vec<(f64, f64)>> {
        relation
            .refs
            .iter()
            .filter(|relation_ref| relation_ref.role == role)
            .map(|relation_ref| -> Result<Vec<_>, PbfReaderError> {
                let way_id = relation_ref
                    .member
                    .way()
                    .map_or(Err(PbfReaderError::NotAWay), |way| Ok(way))?;
                let way = self
                    .ways
                    .get(&way_id.0)
                    .map_or(Err(PbfReaderError::WayNotFound), |w| Ok(w))?
                    .way()
                    .map_or(Err(PbfReaderError::NotAWay), |w| Ok(w))?;
                let points = way
                    .nodes
                    .iter()
                    .map(|p| {
                        self.nodes
                            .get(&p.0)
                            .map_or(Err(PbfReaderError::NodeNotFound), |node| Ok(node))
                            .map(|node| {
                                node.node().map_or(Err(PbfReaderError::NotANode), |n| {
                                    Ok((n.lat(), n.lon()))
                                })
                            })?
                    })
                    .collect::<Result<Vec<_>, PbfReaderError>>()?;

                Ok(points)
            })
            .filter_map(|res| match res {
                Err(_error) => None,
                Ok(v) => Some(v),
            })
            .collect::<Vec<Vec<_>>>()
    }

    pub fn pbf_get_boundaries(file: &PathBuf) -> Result<Vec<Boundary>, PbfReaderError> {
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
            // trace!(element = ?element, "Element");
            if element.is_relation()
                && element.tags().contains("type", "boundary")
                && element.tags().contains("boundary", "administrative")
                && element.tags().contains_key("admin_level")
                && element.tags().contains_key("name")
            {
                reader.relations.push(element);
            } else if element.is_way() {
                reader.ways.insert(element.id().inner_id(), element);
            } else if element.is_node() {
                reader.nodes.insert(element.id().inner_id(), element);
            }
        });

        let boundaries: Vec<Boundary> = reader
            .relations
            .iter()
            .map(|element| {
                if !element.is_relation() {
                    return Err(PbfReaderError::NotARelation);
                }
                let relation = match element.relation() {
                    None => return Err(PbfReaderError::NotARelation),
                    Some(rel) => rel,
                };
                let name = match element
                    .tags()
                    .iter()
                    .find(|tag| tag.0 == "name")
                    .map(|t| t.1)
                {
                    None => {
                        return Err(PbfReaderError::NameNotFound {
                            id: element.id().inner_id(),
                        })
                    }
                    Some(n) => n,
                };
                let level = match element
                    .tags()
                    .iter()
                    .find(|tag| tag.0 == "admin_level")
                    .map(|t| t.1)
                {
                    None => {
                        return Err(PbfReaderError::LevelNotFound {
                            id: element.id().inner_id(),
                        })
                    }
                    Some(n) => n,
                };

                let border_outer_points = reader.get_boundary_from_relation(relation, "outer");
                let border_inner_points = reader.get_boundary_from_relation(relation, "inner");

                Ok(Boundary {
                    id: element.id().inner_id(),
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
