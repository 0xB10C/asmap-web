import init, { AsmapDb, asInfo } from "./pkg/asmap_web.js";

const DATA_REPO = "bitcoin-core/asmap-data";
const LOCAL_LATEST = "latest_asmap.dat";

const input = document.getElementById("input");
const status = document.getElementById("status");
const select = document.getElementById("asmap-select");
const table = document.getElementById("results");
const tbody = table.querySelector("tbody");

let db = null;
// Loaded databases by select value, so switching back is instant.
const cache = new Map();
let current = LOCAL_LATEST;

function render() {
  if (db === null) return;
  tbody.replaceChildren();
  const lines = input.value
    .split(/[\s,;]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  table.hidden = lines.length === 0;
  for (const line of lines) {
    const row = tbody.insertRow();
    row.insertCell().textContent = line;
    const asnCell = row.insertCell();
    const infoCell = row.insertCell();
    try {
      const asn = db.lookup(line);
      if (asn === 0) {
        asnCell.textContent = "unmapped";
        asnCell.className = "err";
      } else {
        const link = document.createElement("a");
        link.href = `https://bgp.tools/as/${asn}`;
        link.textContent = `AS${asn}`;
        asnCell.appendChild(link);
        const info = asInfo(asn);
        if (info === undefined) {
          infoCell.textContent = "unknown";
          infoCell.className = "err";
        } else {
          infoCell.textContent = `${info.description} [${info.country}]`;
          infoCell.title = info.handle;
        }
      }
    } catch (e) {
      asnCell.textContent = String(e.message ?? e);
      asnCell.className = "err";
    }
  }
}

async function fetchDb(value) {
  const url =
    value === LOCAL_LATEST
      ? LOCAL_LATEST
      : `https://raw.githubusercontent.com/${DATA_REPO}/main/${value}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`fetching ${url} failed: HTTP ${response.status}`);
  }
  const data = new Uint8Array(await response.arrayBuffer());
  return { db: new AsmapDb(data), size: data.length };
}

async function selectAsmap(value) {
  select.disabled = true;
  status.textContent = "loading asmap …";
  try {
    if (!cache.has(value)) {
      cache.set(value, await fetchDb(value));
    }
    const entry = cache.get(value);
    db = entry.db;
    current = value;
    status.textContent = `asmap loaded (${(entry.size / 1024 / 1024).toFixed(1)} MiB)`;
    render();
  } catch (e) {
    // Keep the previously loaded database and selection.
    select.value = current;
    status.textContent = `error: ${String(e.message ?? e)}`;
  } finally {
    select.disabled = false;
  }
}

/// Populate the dropdown with all .dat files from the asmap-data repo,
/// newest first. The list is optional: on failure the bundled
/// latest_asmap.dat remains the only choice.
async function loadFileList() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${DATA_REPO}/git/trees/main?recursive=1`,
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const { tree } = await response.json();
    const paths = tree
      .map((entry) => entry.path)
      .filter((p) => p.endsWith(".dat") && p.includes("/"))
      .sort()
      .reverse();
    for (const path of paths) {
      const option = document.createElement("option");
      option.value = path;
      const name = path.split("/").pop();
      // Filenames start with the unix timestamp of the data snapshot.
      const ts = Number.parseInt(name, 10);
      const date = Number.isFinite(ts)
        ? new Date(ts * 1000).toISOString().slice(0, 10)
        : null;
      option.textContent = date ? `${name} (${date})` : name;
      select.append(option);
    }
  } catch (e) {
    console.warn(`fetching asmap file list from ${DATA_REPO} failed:`, e);
  }
}

async function main() {
  try {
    await init();
    select.addEventListener("change", () => selectAsmap(select.value));
    input.addEventListener("input", render);
    await Promise.all([selectAsmap(LOCAL_LATEST), loadFileList()]);
  } catch (e) {
    status.textContent = `error: ${String(e.message ?? e)}`;
  }
}

main();
