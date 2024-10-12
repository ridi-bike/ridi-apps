use axum::{
    body::Bytes,
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use dotenvy::{self, from_filename};
use rsa::pkcs8::DecodePublicKey;
use rsa::signature::Verifier;
use rsa::{
    pkcs1v15::{Signature, VerifyingKey},
    sha2::Sha256,
};
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
        from_filename("../../supabase/functions/.env").expect("Could not load env file");
    }

    env::var("RIDI_API_SIGNING_PUBLIC_KEY").expect("Missing router signature key");

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

async fn test(header_map: HeaderMap, body: Bytes) -> (StatusCode, String) {
    let public_key = env::var("RIDI_API_SIGNING_PUBLIC_KEY").expect("Missing router signature key");
    let signature = header_map
        .get("x-ridi-signature")
        .expect("missing signature header");
    let signature = signature.as_bytes();
    let public_key = public_key.as_str();
    // let decoded_public_key = DecodePublicKey::from_public_key_pem(public_key);
    // let decoded_public_key:

    let verifying_key = VerifyingKey::<Sha256>::from_public_key_pem(public_key)
        .expect("cant create verify key from decoded pem");
    let signature = Signature::try_from(signature)
        .expect("could not construct signature from header signature");
    verifying_key
        .verify(&body, &signature)
        .expect("failed to verify");

    (StatusCode::OK, "omgomg".to_string())
    // match decoded {
    //     Err(error) => {
    //         println!("{}", error.to_string());
    //         return (StatusCode::INTERNAL_SERVER_ERROR, error.to_string());
    //     }
    //     Ok((payload, headers)) => {
    //         let message = std::str::from_utf8(&payload);
    //         payload.set_jwt_id(…)
    //         match message {
    //             Ok(mes) => (StatusCode::OK, mes.to_owned()),
    //             Err(error) => {
    //                 println!("{}", error.to_string());
    //                 return (StatusCode::INTERNAL_SERVER_ERROR, error.to_string());
    //             }
    //         }
    //     }
    // }
}
