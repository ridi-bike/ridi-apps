use std::env;

#[derive(Debug, PartialEq, Eq)]
pub enum RidiEnv {
    Local,
    Prod,
}

pub struct Env {
    pub pbf_location: String,
    pub supabase_db_url: String,
    pub env: RidiEnv,
    pub region: String,
}

impl Env {
    pub fn init() -> Self {
        Env {
            pbf_location: env::var("PBF_LOCATION").expect("PBF_LOCATION env variable"),
            supabase_db_url: env::var("SUPABASE_DB_URL").expect("SUPABASE_DB_URL env variable"),
            region: env::var("REGION").expect("REGION env variable"),
            env: if env::var("RIDI_ENV").expect("RIDI_ENV env variable") == "prod" {
                RidiEnv::Prod
            } else {
                RidiEnv::Local
            },
        }
    }
}
