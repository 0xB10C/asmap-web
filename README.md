# asmap-web

A web frontend for asmap based IP to ASN lookups.

Paste IP addresses (IPv4 or IPv6) into a text box and get the ASN for each.
Lookups run entirely in the browser: the [asmap](https://crates.io/crates/asmap)
Rust crate is compiled to a small (~28 KB) WebAssembly module, and the latest
[bitcoin-core/asmap-data](https://github.com/bitcoin-core/asmap-data) file is
fetched at deploy time.

## Development

Everything runs through the Nix dev shell:

```console
$ nix develop

# run tests, lints, formatting
$ cargo test
$ cargo clippy --all-targets -- -D warnings
$ cargo fmt --check

# build the size-optimized WASM package into site/pkg/
$ ./build-wasm.sh

# grab asmap data and serve the site locally
$ curl -sSfL -o site/latest_asmap.dat https://raw.githubusercontent.com/bitcoin-core/asmap-data/main/latest_asmap.dat
$ python3 -m http.server --directory site
```

## CI

- `rust.yml`: fmt, clippy, tests, and the WASM build on every push/PR.
- `pages.yml`: builds the WASM package, fetches the latest asmap data, and
  deploys `site/` to GitHub Pages on every push to `master`.
