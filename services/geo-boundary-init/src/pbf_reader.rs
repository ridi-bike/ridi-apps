use std::{fmt::Display, io, path::PathBuf, time::Instant};

use osmpbfreader::OsmObj;
use tracing::trace;

#[derive(Debug)]
pub enum PbfReaderError {
    PbfFileOpenError { error: io::Error },
    PbfFileReadError { error: osmpbfreader::Error },
    NotARelation,
    NotANode,
    NotAWay,
    NameNotFound,
    LevelNotFound { id: i64 },
    WayNotFound,
    NodeNotFound,
}

#[derive(Debug)]
pub struct Boundary {
    id: i64,
    name: String,
    polygons_outer: Vec<Vec<(f64, f64)>>,
    polygons_inner: Vec<Vec<(f64, f64)>>,
    level: String,
}

pub fn pbf_get_boundaries(file: &PathBuf) -> Result<Vec<Boundary>, PbfReaderError> {
    let read_start = Instant::now();

    let path = std::path::Path::new(&file);
    let r =
        std::fs::File::open(path).map_err(|error| PbfReaderError::PbfFileOpenError { error })?;
    let mut pbf = osmpbfreader::OsmPbfReader::new(r);

    let mut nodes: Vec<OsmObj> = Vec::new();
    let mut ways: Vec<OsmObj> = Vec::new();
    let mut relations: Vec<OsmObj> = Vec::new();

    pbf.get_objs_and_deps(|obj| {
        obj.is_relation()
            && obj.tags().contains("type", "boundary")
            && obj.tags().contains("boundary", "administrative")
            && obj.tags().contains_key("admin_level")
    })
    .map_err(|error| PbfReaderError::PbfFileReadError { error })?
    .into_iter()
    .for_each(|(_id, element)| {
        trace!(element = ?element, "Element");
        if element.is_relation() {
            relations.push(element);
        } else if element.is_way() {
            ways.push(element);
        } else if element.is_node() {
            nodes.push(element);
        }
    });

    let boundaries: Vec<Boundary> = relations
        .iter()
        .map(|element| {
            if !element.is_relation() {
                return Err(PbfReaderError::NotARelation);
            }
            let relation = match element.relation() {
                None => return Err(PbfReaderError::NotARelation),
                Some(rel) => rel,
            };
            let mut tags_iter = element.tags().iter();
            let name = match tags_iter.find(|tag| tag.0 == "name").map(|t| t.1) {
                None => return Err(PbfReaderError::NameNotFound),
                Some(n) => n,
            };
            let level = match tags_iter.find(|tag| tag.0 == "admin_level").map(|t| t.1) {
                None => {
                    return Err(PbfReaderError::LevelNotFound {
                        id: element.id().inner_id(),
                    })
                }
                Some(n) => n,
            };

            let border_outer_points = relation
                .refs
                .iter()
                .filter(|relation_ref| relation_ref.role == "outer")
                .map(|relation_ref| {
                    let way_id = relation_ref
                        .member
                        .way()
                        .map_or(Err(PbfReaderError::NotAWay), |way| Ok(way))?;
                    let way = ways
                        .iter()
                        .find(|w| w.id().inner_id() == way_id.0)
                        .map_or(Err(PbfReaderError::WayNotFound), |w| Ok(w))?
                        .way()
                        .map_or(Err(PbfReaderError::NotAWay), |w| Ok(w))?;
                    let points = way
                        .nodes
                        .iter()
                        .map(|p| {
                            nodes
                                .iter()
                                .find(|node| node.id().inner_id() == p.0)
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
                .collect::<Result<Vec<Vec<_>>, PbfReaderError>>()?;

            let border_inner_points = relation
                .refs
                .iter()
                .filter(|relation_ref| relation_ref.role == "inner")
                .map(|relation_ref| {
                    let way_id = relation_ref
                        .member
                        .way()
                        .map_or(Err(PbfReaderError::NotAWay), |way| Ok(way))?;
                    let way = ways
                        .iter()
                        .find(|w| w.id().inner_id() == way_id.0)
                        .map_or(Err(PbfReaderError::WayNotFound), |w| Ok(w))?
                        .way()
                        .map_or(Err(PbfReaderError::NotAWay), |w| Ok(w))?;
                    let points = way
                        .nodes
                        .iter()
                        .map(|p| {
                            nodes
                                .iter()
                                .find(|node| node.id().inner_id() == p.0)
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
                .collect::<Result<Vec<Vec<_>>, PbfReaderError>>()?;

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
