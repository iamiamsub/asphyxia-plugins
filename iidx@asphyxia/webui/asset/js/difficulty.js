// Difficulty Tables page: lists a table's charts (iidxGetDifficulty) and changes a chart's rank
// (iidxSetDifficulty) as soon as it is picked.
(() => {
  const $ = (id) => document.getElementById(id);
  const RANKS = ["F-", "F", "E", "D", "C", "B", "B+", "A", "A+", "S", "S+"];
  const CHART = ["SPB", "SPN", "SPH", "SPA", "SPL", "DPB", "DPN", "DPH", "DPA", "DPL"];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let rows = [];

  const post = async (event, body) => {
    const res = await fetch("/emit/" + event, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(res.status + " " + (await res.text()));
    return res.json();
  };

  const editor = (r, table) => {
    if (table == "dp_normal")
      return `<input class="input is-small df-edit" style="width:6em" type="number" step="0.1" min="1" max="13" value="${esc(r.current ?? "")}" placeholder="none">`;
    const opts = ['<option value="">none</option>'];
    for (const kind of ["地力", "個人差"]) for (const rank of RANKS) {
      const label = kind + rank;
      opts.push(`<option value="${label}"${label == r.current ? " selected" : ""}>${label}</option>`);
    }
    return `<div class="select is-small"><select class="df-edit">${opts.join("")}</select></div>`;
  };

  const draw = () => {
    const table = $("df-table").value, q = $("df-filter").value.trim().toLowerCase();
    const shown = rows.filter((r) => (!q || r.title.toLowerCase().includes(q)) && (!$("df-changed").checked || r.current !== r.snapshot) && (!$("df-unrated").checked || r.current === null));
    $("df-rows").innerHTML = shown.map((r) => `
      <tr data-mid="${r.mid}" data-chart="${r.chart}">
        <td>${esc(r.title)}</td><td>${CHART[r.chart]}</td><td>${esc(r.snapshot ?? "-")}</td>
        <td>${editor(r, table)}</td>
        <td>${r.current !== r.snapshot ? '<button class="button is-small df-reset">Snapshot</button>' : ""}</td></tr>`).join("");
    const changed = rows.filter((r) => r.current !== r.snapshot).length;
    $("df-status").textContent = `${shown.length} of ${rows.length} charts` + (changed ? `, ${changed} changed from the snapshot` : "");
  };

  const load = async () => {
    const table = $("df-table").value;
    $("df-level-box").style.display = table == "dp_normal" ? "" : "none";
    $("df-status").textContent = "Loading...";
    try {
      const d = await post("iidxGetDifficulty", { table, level: Number($("df-level").value) });
      rows = d.rows;
      const src = d.source ?? {};
      $("df-source").innerHTML = src.source ? `Snapshot of <a href="${esc(src.source)}" target="_blank" rel="noopener">${esc(src.name)}</a>, taken ${esc(src.fetched)}.` : "";
      if (!d.songs) return ($("df-status").textContent = "Import the song list on the Customize Images page first: the charts are listed from it.");
      draw();
    } catch (e) {
      $("df-status").textContent = "Could not load: " + e.message;
    }
  };

  const save = async (tr, body) => {
    const r = rows.find((x) => x.mid == tr.dataset.mid && x.chart == tr.dataset.chart);
    try {
      r.current = (await post("iidxSetDifficulty", { table: $("df-table").value, mid: r.mid, chart: r.chart, ...body })).current;
    } catch (e) {
      alert("Not saved: " + e.message);
    }
    draw();
  };

  $("df-rows").addEventListener("change", (e) => {
    if (e.target.classList.contains("df-edit")) save(e.target.closest("tr"), { label: e.target.value || null });
  });
  $("df-rows").addEventListener("click", (e) => {
    if (e.target.classList.contains("df-reset")) save(e.target.closest("tr"), { reset: true });
  });
  $("df-table").addEventListener("change", load);
  $("df-level").addEventListener("change", load);
  for (const id of ["df-filter", "df-changed", "df-unrated"]) $(id).addEventListener("input", draw);
  load();
})();
