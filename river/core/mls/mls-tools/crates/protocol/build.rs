use std::{env, path::PathBuf};

fn main() {
    let out_dir = PathBuf::from(env::var("OUT_DIR")
        .unwrap());

    tonic_build::configure()
        .out_dir(out_dir)
        .type_attribute(
            ".",
            "#[derive(serde::Serialize,serde::Deserialize)]"
        )
        .type_attribute(
            ".",
            r#"#[serde(rename_all = "camelCase")]"#
        )
        .build_server(true)
        .build_client(false)
        .compile_protos(&["proto/mls_tools.proto"], &["proto"])
        .unwrap();
}