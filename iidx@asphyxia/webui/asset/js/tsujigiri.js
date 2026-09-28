// Tsujigiri page: today's hidden characters and their songs of the chosen version (iidxGetTsujigiri).
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const load = async () => {
    $("tg-status").textContent = "Loading...";
    $("tg-rows").innerHTML = "";
    try {
      const res = await fetch("/emit/iidxGetTsujigiri", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: Number($("tg-version").value) }),
      });
      if (!res.ok) throw new Error(res.status + " " + (await res.text()));
      const { date, rows } = await res.json();
      const d = String(date);
      $("tg-status").textContent = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)} (Japan)`;
      $("tg-rows").innerHTML = rows
        .map((r) => `<tr><td>${esc(r.title)}</td><td>${esc(r.name)}${r.chara == 19 || r.chara == 20 ? " ★" : ""}</td></tr>`)
        .join("");
    } catch (e) {
      $("tg-status").textContent = "Could not load: " + e.message;
    }
  };
  $("tg-version").addEventListener("change", load);
  load();
})();
