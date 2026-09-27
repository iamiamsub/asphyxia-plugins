// Settings tab, EPOLIS / Pinky Crush / Sparkle Shower (31-33): the customize lists are each
// version's own (names, ids and QPro tables taken out of its bm2dx.dll, json/customize_<version>.json),
// and every item can be chosen from its picture once that version's pictures are imported on the
// Customize Images page. Other versions keep the page's own lists.
(function () {
  "use strict";
  const VERSIONS = ["31", "32", "33"];
  const IMAGES = "static/asset/customize/";

  // field id on the page -> list in customize_<version>.json
  const ITEMS = {
    turntable: "turntable", note_burst: "note_burst", note_skin: "note_skin", cn_color: "cn_color",
    note_beam: "note_beam", lane_cover: "lane_cover", lift_cover: "lift_cover", pacemaker_cover: "pacemaker_cover",
    full_combo_splash: "full_combo_splash", judge_font: "judge_font", frame: "frame",
    lm_skin: "premium_skin", lm_bg: "premium_bg", lm_bg_2: "premium_bg_concent",
  };
  const QPRO = { qpro_head: "head", qpro_hair: "hair", qpro_face: "face", qpro_hand: "hand", qpro_body: "body", qpro_back: "back" };
  const LM = { lm_skin: "premium_skin", lm_bg: "premium_bg", lm_bg_2: "premium_bg_concent", lm_entry_bg: "entry_bg" };

  const version = document.getElementById("version");
  if (!version) return;
  const refid = () => (document.querySelector('input[name="refid"]') || {}).value;
  const post = async (event, body) =>
    (await fetch("/emit/" + event, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })).json();

  const css = document.createElement("style");
  css.textContent = `
    .cz-bar { display: flex; align-items: center; gap: .5rem; margin-top: .25rem; }
    .cz-note { font-size: .85rem; opacity: .8; }
    .cz-panel { margin-top: .5rem; padding: .5rem; border: 1px solid rgba(128,128,128,.4); border-radius: 4px; }
    .cz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 6px;
      max-height: 28rem; overflow-y: auto; margin-top: .5rem; }
    .cz-item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 3px; cursor: pointer;
      border: 2px solid transparent; border-radius: 4px; background: none; color: inherit; font-size: .72rem;
      line-height: 1.2; text-align: center; word-break: break-all; }
    .cz-item:hover { border-color: rgba(128,128,128,.5); }
    .cz-item.is-chosen { border-color: #00d1b2; }
    .cz-item img { width: 100%; height: 96px; object-fit: contain; }`;
  document.head.appendChild(css);

  const tables = {}; // version -> customize_<version>.json
  let pictures = {}; // version -> { previews, qpro, entry }
  const widgets = [];

  /** [value, label, picture url or null] for a field in a version. */
  function entries(id, v) {
    const table = tables[v], have = pictures[v] || {}, dir = IMAGES + v + "/";
    if (ITEMS[id]) return (table.items[ITEMS[id]] || []).map(([n, name, jpg]) => [n, name, have.previews && jpg ? dir + jpg : null]);
    if (id === "lm_entry_bg") return (table.entry || []).map(([n]) => [n, "", have.entry ? dir + `entry_bg_${n}.png` : null]);
    const part = QPRO[id], suffix = new RegExp("_(" + (part === "back" ? "bg" : part) + ")\\.ifs$");
    return (table.qpro[part] || []).map(([n, ifs]) => [
      n,
      n === 0 && part === "back" ? "none" : ifs.replace(/^qp_/, "").replace(suffix, ""),
      have.qpro ? dir + `qpro_${part}_${n}.png` : null,
    ]);
  }

  function setup(el) {
    const field = el.closest(".field");
    const w = { el, list: [], original: el.tagName === "SELECT" ? el.innerHTML : null };
    w.bar = document.createElement("div");
    w.bar.className = "cz-bar";
    w.button = document.createElement("button");
    w.button.type = "button";
    w.button.className = "button is-small";
    w.button.textContent = "Choose...";
    w.note = document.createElement("span");
    w.note.className = "cz-note";
    w.bar.append(w.button, w.note);
    w.panel = document.createElement("div");
    w.panel.className = "cz-panel";
    w.panel.hidden = true;
    field.append(w.bar, w.panel);

    w.button.addEventListener("click", () => {
      if (!w.panel.firstChild) build(w);
      w.panel.hidden = !w.panel.hidden;
      mark(w);
    });
    el.addEventListener("change", () => note(w));
    el.addEventListener("input", () => note(w));
    widgets.push(w);
  }

  function build(w) {
    const filter = document.createElement("input");
    filter.className = "input is-small";
    filter.placeholder = "Filter by name or number";
    const grid = document.createElement("div");
    grid.className = "cz-grid";
    for (const [v, label, src] of w.list) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "cz-item";
      item.dataset.value = v;
      item.dataset.search = (v + " " + label).toLowerCase();
      if (src) {
        const img = document.createElement("img");
        img.loading = "lazy";
        img.src = src;
        img.alt = "";
        img.onerror = () => img.remove();
        item.append(img);
      }
      const caption = document.createElement("span");
      caption.textContent = label ? v + " " + label : String(v);
      item.append(caption);
      item.addEventListener("click", () => {
        w.el.value = v;
        w.el.dispatchEvent(new Event("change", { bubbles: true }));
        w.panel.hidden = true;
      });
      grid.append(item);
    }
    filter.addEventListener("input", () => {
      const q = filter.value.trim().toLowerCase();
      for (const item of grid.children) item.hidden = q !== "" && !item.dataset.search.includes(q);
    });
    w.panel.append(filter, grid);
  }

  function mark(w) {
    for (const item of w.panel.querySelectorAll(".cz-item")) item.classList.toggle("is-chosen", item.dataset.value === String(w.el.value));
  }

  function note(w) {
    const e = w.list.find(([v]) => String(v) === String(w.el.value));
    // a select shows the name itself
    w.note.textContent = w.original !== null ? "" : e ? e[1] : "";
    mark(w);
  }

  /** Switches the fields to the selected version's lists, or back to the page's own. */
  function apply() {
    const v = version.value, on = VERSIONS.includes(v) && !!tables[v];
    for (const w of widgets) {
      w.list = on ? entries(w.el.id, v) : [];
      w.panel.replaceChildren();
      w.panel.hidden = true;
      if (w.original !== null) {
        const value = w.el.value;
        if (w.list.length) {
          w.el.innerHTML = "";
          for (const [n, label] of w.list) w.el.append(new Option(label || String(n), n));
        } else w.el.innerHTML = w.original;
        w.el.value = value;
      }
      w.bar.style.display = w.list.length ? "" : "none";
      note(w);
    }
    return on;
  }

  /** The stored values: the page's own lists may not hold them (items newer than the list). */
  async function load() {
    const data = await post("iidxGetSetting", { refid: refid(), version: version.value });
    for (const w of widgets) {
      const key = w.el.id, value = LM[key] ? data.lm_custom && data.lm_custom[LM[key]] : data.custom && data.custom[key];
      if (value !== undefined && value !== null) w.el.value = value;
      note(w);
    }
  }

  (async () => {
    // all of them first, so a version change can switch the lists at once (setting.js then
    // puts that version's values in)
    await Promise.all(VERSIONS.map(async (v) => {
      try {
        tables[v] = await (await fetch(`static/asset/json/customize_${v}.json`)).json();
      } catch (e) {
        // that version keeps the page's lists
      }
    }));
    try {
      pictures = await post("iidxCustomizeImageStatus");
    } catch (e) {
      // no pictures: names only
    }
    for (const id of [...Object.keys(ITEMS), "lm_entry_bg", ...Object.keys(QPRO)]) {
      const el = document.getElementById(id);
      if (el) setup(el);
    }
    if (!Object.keys(pictures).length) {
      const hint = document.createElement("p");
      hint.className = "help";
      hint.innerHTML = 'Pictures for "Choose..." can be imported on the <a href="customize_images">Customize Images</a> page.';
      version.closest(".field").append(hint);
    }
    if (apply()) await load();
    version.addEventListener("change", apply);
  })();
})();
