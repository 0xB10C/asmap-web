#!/usr/bin/env bash
# Build the size-optimized WASM package into site/pkg/.
# Requires: cargo (wasm32-unknown-unknown), wasm-bindgen, wasm-opt (nix develop)
set -euo pipefail
cd "$(dirname "$0")"

cargo build --release --target wasm32-unknown-unknown

wasm-bindgen \
    --target web \
    --no-typescript \
    --out-dir site/pkg \
    target/wasm32-unknown-unknown/release/asmap_web.wasm

wasm-opt -Oz --enable-bulk-memory --enable-nontrapping-float-to-int \
    -o site/pkg/asmap_web_bg.wasm \
    site/pkg/asmap_web_bg.wasm

echo "wasm size: $(stat -c%s site/pkg/asmap_web_bg.wasm) bytes"
