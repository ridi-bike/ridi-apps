#[allow(unused)]
use postgres::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct GeoBoundariesListRow {
    pub name: String,
    pub level: f64,
}

#[allow(non_snake_case)]
pub fn GeoBoundariesList(
    client: &mut Client,
) -> Result<Vec<GeoBoundariesListRow>, postgres::Error> {
    let stmt = client.prepare(r#"select name, level from geo_boundaries"#)?;

    let result: Result<Vec<GeoBoundariesListRow>, postgres::Error> = client
        .query(&stmt, &[])?
        .iter()
        .map(|row| {
            Ok(GeoBoundariesListRow {
                name: row.try_get(0)?,
                level: row.try_get(1)?,
            })
        })
        .collect();

    result
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeoBoundariesGetRow {
    pub name: String,
    pub level: f64,
}

#[allow(non_snake_case)]
pub fn GeoBoundariesGet(
    client: &mut Client,
) -> Result<Option<GeoBoundariesGetRow>, postgres::Error> {
    let stmt = client.prepare(r#"select name, level from geo_boundaries limit 1"#)?;

    let result: Result<Option<GeoBoundariesGetRow>, postgres::Error> = client
        .query(&stmt, &[])?
        .get(0)
        .map(|row| {
            Ok(GeoBoundariesGetRow {
                name: row.try_get(0)?,
                level: row.try_get(1)?,
            })
        })
        .map_or(Ok(None), |v| v.map(Some));

    result
}

#[allow(non_snake_case)]
pub fn GeoBoundariesInsert(client: &mut Client, name: String) -> Result<u64, postgres::Error> {
    client.execute(
        r#"insert into geo_boundaries (name)
values ($1)"#,
        &[&name],
    )
}
