//! WASM wrapper around the [`asmap`] crate for IP-to-ASN lookups in the
//! browser, plus [`asinfo`]-based ASN-to-metadata lookups.

use std::net::IpAddr;

use asmap::Asmap;
use wasm_bindgen::prelude::*;

/// Validate raw asmap bytes.
fn load(data: Vec<u8>) -> Result<Asmap, String> {
    Asmap::from_bytes(data).map_err(|e| e.to_string())
}

/// Look up the ASN for an IP address string. Returns 0 for unmapped addresses.
fn lookup_str(map: &Asmap, ip: &str) -> Result<u32, String> {
    let addr: IpAddr = ip
        .trim()
        .parse()
        .map_err(|_| format!("invalid IP address: {ip}"))?;
    Ok(map.lookup(addr))
}

/// A loaded asmap database, exposed to JavaScript.
#[wasm_bindgen]
pub struct AsmapDb {
    inner: Asmap,
}

#[wasm_bindgen]
impl AsmapDb {
    /// Validate raw asmap bytes (e.g. the contents of `latest_asmap.dat`)
    /// and construct a lookup database.
    #[wasm_bindgen(constructor)]
    pub fn new(data: Vec<u8>) -> Result<AsmapDb, JsError> {
        let inner = load(data).map_err(|e| JsError::new(&e))?;
        Ok(AsmapDb { inner })
    }

    /// Look up the ASN for an IP address string (IPv4 or IPv6).
    /// Returns 0 for unmapped addresses, throws for unparseable input.
    pub fn lookup(&self, ip: &str) -> Result<u32, JsError> {
        lookup_str(&self.inner, ip).map_err(|e| JsError::new(&e))
    }
}

/// Metadata of an autonomous system, exposed to JavaScript.
#[wasm_bindgen(getter_with_clone)]
pub struct AsInfo {
    /// The autonomous system number.
    pub asn: u32,
    /// Short handle, e.g. `"LVLT-1"`.
    pub handle: String,
    /// Human-readable description, e.g. `"Level 3 Parent LLC"`.
    pub description: String,
    /// ISO 3166-1 alpha-2 country code, e.g. `"US"`.
    pub country: String,
}

/// Look up the handle, description, and country of an AS by its ASN.
/// Returns `undefined` for ASNs not in the embedded dataset.
#[wasm_bindgen(js_name = asInfo)]
pub fn as_info(asn: u32) -> Option<AsInfo> {
    let info = asinfo::lookup(asn)?;
    Some(AsInfo {
        asn: info.asn,
        handle: info.handle.to_string(),
        description: info.description.to_string(),
        country: info.country.as_str().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> Asmap {
        load(std::fs::read("fixtures/asmap.raw").unwrap()).unwrap()
    }

    #[test]
    fn load_rejects_garbage() {
        let err = load(vec![0xFF; 64]).unwrap_err();
        assert!(err.contains("validation"), "got: {err}");
    }

    #[test]
    fn load_accepts_fixture() {
        fixture();
    }

    #[test]
    fn lookup_v4() {
        let map = fixture();
        // 250.0.0.0/8 -> AS1000 in the fixture
        assert_eq!(lookup_str(&map, "250.1.2.3").unwrap(), 1000);
        // 101.5.0.0/16 -> AS5 in the fixture
        assert_eq!(lookup_str(&map, "101.5.42.7").unwrap(), 5);
    }

    #[test]
    fn lookup_v6() {
        let map = fixture();
        // IPv6-mapped form of a mapped IPv4 address
        assert_eq!(lookup_str(&map, "::ffff:250.0.0.1").unwrap(), 1000);
        // native IPv6 parses and looks up without error
        lookup_str(&map, "2001:db8::1").unwrap();
    }

    #[test]
    fn lookup_unmapped_returns_zero() {
        let map = fixture();
        assert_eq!(lookup_str(&map, "127.0.0.1").unwrap(), 0);
    }

    #[test]
    fn lookup_trims_whitespace() {
        let map = fixture();
        assert_eq!(lookup_str(&map, "  250.0.0.1\t").unwrap(), 1000);
    }

    #[test]
    fn as_info_known_asn() {
        // ASN 0 is reserved by IANA and stable across dataset updates.
        let info = as_info(0).unwrap();
        assert_eq!(info.asn, 0);
        assert_eq!(info.country, "US");
        assert!(!info.handle.is_empty());
        assert!(!info.description.is_empty());
    }

    #[test]
    fn as_info_unknown_asn() {
        assert!(as_info(u32::MAX).is_none());
    }

    #[test]
    fn lookup_rejects_invalid_input() {
        let map = fixture();
        for bad in ["", "not-an-ip", "300.0.0.1", "1.2.3", "example.com"] {
            let err = lookup_str(&map, bad).unwrap_err();
            assert!(err.contains("invalid IP address"), "got: {err}");
        }
    }
}
