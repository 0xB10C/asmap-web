import init, { AsmapDb, asInfo } from "./pkg/asmap_web.js";

const input = document.getElementById("input");
const status = document.getElementById("status");
const table = document.getElementById("results");
const tbody = table.querySelector("tbody");

let db = null;

function render() {
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

async function main() {
  try {
    const [, response] = await Promise.all([
      init(),
      fetch("latest_asmap.dat"),
    ]);
    if (!response.ok) {
      throw new Error(`fetching latest_asmap.dat failed: HTTP ${response.status}`);
    }
    const data = new Uint8Array(await response.arrayBuffer());
    db = new AsmapDb(data);
    status.textContent = `asmap loaded (${(data.length / 1024 / 1024).toFixed(1)} MiB)`;
    input.addEventListener("input", render);
    render();
  } catch (e) {
    status.textContent = `error: ${String(e.message ?? e)}`;
  }
}

main();
