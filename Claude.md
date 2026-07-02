I want a minimal website where I can past in one or more IP addresses into a text box, and it gives me the ASN for each.

For this I want to use the rust library https://crates.io/crates/asmap to look up IP addresses to ASN. To use this in the browser, we need to build a WASM wrapper around it.

The website should be hosted on GitHub pages, so please add a CI job for this. 

Ideally, the wasm package is small (file size) and optimized. 

We want to use the latest asmap from https://github.com/bitcoin-core/asmap-data for it.

on the rust side, we want to have a CI job that builds this, tests it, runs clippy, and fmt


