use std::path::PathBuf;

pub fn read_pbf(file: &PathBuf) -> Result<(), OsmDataReaderError> {
    let read_start = Instant::now();

    let path = std::path::Path::new(&file);
    let r = std::fs::File::open(path)
        .map_err(|error| OsmDataReaderError::PbfFileOpenError { error })?;
    let mut pbf = osmpbfreader::OsmPbfReader::new(r);

    let elements = pbf
        .get_objs_and_deps(|obj| {
            obj.is_way()
                && obj.tags().iter().any(|t| {
                    t.0 == "highway"
                        && (ALLOWED_HIGHWAY_VALUES.contains(&t.1.as_str())
                            || (t.1 == "path"
                                && obj
                                    .tags()
                                    .iter()
                                    .any(|t2| t2.0 == "motorcycle" && t2.1 == "yes")))
                })
        })
        .map_err(|error| OsmDataReaderError::PbfFileReadError { error })?;

    for (_id, element) in elements {
        if element.is_node() {
            let node = element.node().ok_or(OsmDataReaderError::PbfFileError {
                error: String::from("expected node, did not get it"),
            })?;
            self.map_data.insert_node(OsmNode {
                id: node.id.0 as u64,
                lat: node.lat(),
                lon: node.lon(),
            });
        } else if element.is_way() {
            let way = element.way().ok_or(OsmDataReaderError::PbfFileError {
                error: String::from("expected way, did not get it"),
            })?;
            self.map_data
                .insert_way(OsmWay {
                    id: way.id.0 as u64,
                    point_ids: way.nodes.iter().map(|v| v.0 as u64).collect(),
                    tags: Some(
                        way.tags
                            .iter()
                            .map(|v| (v.0.to_string(), v.1.to_string()))
                            .collect(),
                    ),
                })
                .map_err(|error| OsmDataReaderError::MapDataError { error })?;
        } else if element.is_relation() {
            let relation = element.relation().ok_or(OsmDataReaderError::PbfFileError {
                error: String::from("expected relation, did not get it"),
            })?;
            self.map_data
                .insert_relation(OsmRelation {
                    id: relation.id.0 as u64,
                    members: relation
                        .refs
                        .iter()
                        .map(|v| -> Result<OsmRelationMember, OsmDataReaderError> {
                            Ok(OsmRelationMember {
                                member_ref: match v.member {
                                    osmpbfreader::OsmId::Way(id) => id.0 as u64,
                                    osmpbfreader::OsmId::Node(id) => id.0 as u64,
                                    osmpbfreader::OsmId::Relation(id) => id.0 as u64,
                                },
                                role: match v.role.as_str() {
                                    "from" => OsmRelationMemberRole::From,
                                    "to" => OsmRelationMemberRole::To,
                                    "via" => OsmRelationMemberRole::Via,
                                    _ => Err(OsmDataReaderError::PbfFileError {
                                        error: String::from("unknown role"),
                                    })?,
                                },
                                member_type: match v.member {
                                    osmpbfreader::OsmId::Way(_) => OsmRelationMemberType::Way,
                                    osmpbfreader::OsmId::Node(_) => OsmRelationMemberType::Node,
                                    _ => Err(OsmDataReaderError::PbfFileError {
                                        error: String::from("unexpected member type"),
                                    })?,
                                },
                            })
                        })
                        .collect::<Result<Vec<OsmRelationMember>, OsmDataReaderError>>()?,
                    tags: relation
                        .tags
                        .iter()
                        .map(|v| (v.0.to_string(), v.1.to_string()))
                        .collect(),
                })
                .map_err(|error| OsmDataReaderError::MapDataError { error })?;
        }
    }

    self.map_data.generate_point_hashes();

    let read_duration = read_start.elapsed();
    trace!("file read took {} seconds", read_duration.as_secs());

    Ok(())
}
