use axum::{
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use dotenvy::{self, from_filename};
use jws::compact::decode_verify;
use jws::hmac::HmacVerifier;
use serde::Deserialize;
use std::{env, str::FromStr};

#[derive(PartialEq)]
enum AppEnv {
    Dev,
    Prod,
}

impl FromStr for AppEnv {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "dev" => Ok(Self::Dev),
            "prod" => Ok(Self::Prod),
            s => Err(format!("Invalid AppEnv: {s}")),
        }
    }
}

#[tokio::main]
async fn main() {
    // initialize tracing
    tracing_subscriber::fmt::init();

    let app_env = env::var("RIDI_APP_ENV")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(AppEnv::Dev);

    if app_env == AppEnv::Dev {
        from_filename("../../.env").expect("Could not load env file");
    }

    env::var("RIDI_ROUTER_SECRET_KEY").expect("Missing router signature key");

    let app = Router::new()
        .route("/", get(root))
        .route("/test", post(test));

    let address = "0.0.0.0:2727";
    let listener = tokio::net::TcpListener::bind(&address).await.unwrap();
    println!("Listening: {address}");
    axum::serve(listener, app).await.unwrap();
}

async fn root() -> &'static str {
    "Hello, World!"
}

#[derive(Deserialize)]
struct TestPayload {
    payload: String,
}
async fn test(Json(body): Json<TestPayload>) -> (StatusCode, String) {
    let secret_key = env::var("RIDI_ROUTER_SECRET_KEY").expect("Missing router signature key");
    let decoded = decode_verify(
        body.payload.as_bytes(),
        &HmacVerifier::new(secret_key.as_bytes()),
    );
    match decoded {
        Err(error) => (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()),
        Ok(decoded) => {
            let message = std::str::from_utf8(&decoded.payload);
            match message {
                Ok(mes) => (StatusCode::OK, mes.to_owned()),
                Err(error) => (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()),
            }
        }
    }
}
