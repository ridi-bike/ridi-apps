#[allow(unused)]
use postgres::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct GeoBoundariesListRow {
    pub id: i64,
    pub name: String,
    pub level: i16,
    pub updated_at: i64,
}

pub fn geo_boundaries_list(
    client: &mut Client,
) -> Result<Vec<GeoBoundariesListRow>, postgres::Error> {
    let stmt = client.prepare(r#"select id, name, level, updated_at from geo_boundaries"#)?;

    let result: Result<Vec<GeoBoundariesListRow>, postgres::Error> = client
        .query(&stmt, &[])?
        .iter()
        .map(|row| {
            Ok(GeoBoundariesListRow {
                id: row.try_get(0)?,
                name: row.try_get(1)?,
                level: row.try_get(2)?,
                updated_at: row.try_get(3)?,
            })
        })
        .collect();

    result
}

pub fn geo_boundaries_upsert(
    client: &mut Client,
    id: i64,
    name: String,
    level: i16,
    polygon: String,
) -> Result<u64, postgres::Error> {
    client.execute(
        r#"insert into geo_boundaries (id, name, level, updated_at, polygon)
values ($1, $2, $3, now(), $4::text)
on conflict (id) do update
set polygon = excluded.polygon,
  name = excluded.name,
  level = excluded.level,
  updated_at = excluded.updated_at"#,
        &[&id, &name, &level, &polygon],
    )
}
