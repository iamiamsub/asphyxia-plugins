// The Customize Images page: reads a game version's data/graphic folder chosen in the browser and
// sends the customize previews (as they are), QPro thumbnails (made from qp_*.ifs with IIDXGfx),
// entry backgrounds (entry_card*.ifs) and the badge parts (1/badge*.ifs, for the Badge tab) to the
// server, which keeps them per version for the pickers on the Settings tab.
(function () {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const folder = byId("cz-folder"), start = byId("cz-start"), progress = byId("cz-progress"), log = byId("cz-log");
  const version = byId("cz-version");
  const THUMB = 128; // longest side of a QPro thumbnail
  const BATCH = 4 << 20; // base64 characters per request (the server takes up to 50 MB)

  const say = (text) => {
    log.style.display = "";
    log.textContent += text + "\n";
    log.scrollTop = log.scrollHeight;
  };

  const post = async (event, body) => {
    const res = await fetch("/emit/" + event, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error(event + ": " + res.status + " " + (await res.text()));
    return res.json();
  };

  const showStatus = async () => {
    try {
      const s = await post("iidxCustomizeImageStatus");
      const lines = Object.entries(s).map(([v, c]) => `${v}: ${c.previews} customize previews, ${c.qpro} QPro thumbnails, ${c.entry} entry backgrounds` + (c.badge ? `, ${c.badge} badge parts` : "") + (c.music ? `, ${c.music} songs` : ""));
      byId("cz-status").textContent = lines.length ? "This server has pictures for " + lines.join(" / ") : "This server has no pictures yet.";
    } catch (e) {
      byId("cz-status").textContent = "Could not ask the server: " + e.message;
    }
  };

  const base64 = (bytes) => {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };

  /**
   * The previews (customize/*.jpg), the archives (qp_*.ifs, entry_card*.ifs, by name) and the badge
   * archives (1/badge*.ifs: the game reads graphic/1, graphic/0 has older ones) in the chosen folder.
   */
  function pick(files) {
    const previews = [], archives = new Map(), badges = [];
    for (const f of files) {
      const path = (f.webkitRelativePath || f.name).replace(/\\/g, "/");
      const m = path.match(/(?:^|\/)customize\/([a-z0-9_]+\.jpg)$/i);
      if (m) previews.push({ name: m[1].toLowerCase(), file: f });
      else if (/(?:^|\/)1\/badge(_old_3[12])?\.ifs$/i.test(path)) badges.push(f);
      else if (/^(qp_|entry_card).*\.ifs$/i.test(f.name) && !archives.has(f.name.toLowerCase())) archives.set(f.name.toLowerCase(), f);
    }
    return { previews, archives, badges };
  }

  /** An image at its own size as PNG bytes (badge parts are laid out by their pixel positions). */
  async function png({ width, height, rgba }) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").putImageData(new ImageData(rgba, width, height), 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return new Uint8Array(await blob.arrayBuffer());
  }

  /** A picture as PNG bytes: the layers drawn together, cropped to what is drawn, scaled down. */
  async function thumbnail({ row, layers }) {
    if (!layers.length) return null;
    const w = row ? layers.reduce((s, l) => s + l.width, 0) : Math.max(...layers.map((l) => l.width));
    const h = Math.max(...layers.map((l) => l.height));
    const full = document.createElement("canvas");
    full.width = w;
    full.height = h;
    const g = full.getContext("2d");
    let x = 0;
    for (const l of layers) {
      g.drawImage(await createImageBitmap(new ImageData(l.rgba, l.width, l.height)), row ? x : 0, 0);
      x += l.width;
    }

    // the parts sit in a large transparent frame: keep only what is drawn
    const px = g.getImageData(0, 0, w, h).data;
    let x1 = w, y1 = h, x2 = -1, y2 = -1;
    for (let y = 0; y < h; y++)
      for (let i = 0; i < w; i++)
        if (px[(y * w + i) * 4 + 3] > 8) {
          if (i < x1) x1 = i;
          if (i > x2) x2 = i;
          if (y < y1) y1 = y;
          if (y > y2) y2 = y;
        }
    if (x2 < 0) return null;
    const cw = x2 - x1 + 1, ch = y2 - y1 + 1, scale = Math.min(1, THUMB / Math.max(cw, ch));
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(cw * scale));
    out.height = Math.max(1, Math.round(ch * scale));
    const o = out.getContext("2d");
    o.imageSmoothingQuality = "high";
    o.drawImage(full, x1, y1, cw, ch, 0, 0, out.width, out.height);
    const blob = await new Promise((resolve) => out.toBlob(resolve, "image/png"));
    return new Uint8Array(await blob.arrayBuffer());
  }

  folder.addEventListener("change", () => {
    byId("cz-folder-name").textContent = folder.files.length ? `${folder.files.length} files` : "No folder chosen";
    start.disabled = !folder.files.length;
  });

  start.addEventListener("click", async () => {
    start.disabled = true;
    log.textContent = "";
    progress.value = 0;
    progress.style.display = "";
    try {
      const v = Number(version.value);
      const { previews, archives, badges } = pick(folder.files);
      const table = await (await fetch(`static/asset/json/customize_${v}.json`)).json();
      const jobs = []; // { name, make: () => Promise<bytes | null> }
      if (byId("cz-previews").checked)
        for (const p of previews) jobs.push({ name: p.name, make: async () => new Uint8Array(await p.file.arrayBuffer()) });

      // a picture made from an archive; one per archive and kind, for ids that share a file
      const made = new Map();
      const fromArchive = (picture, archive, layers) => {
        const file = archives.get(archive.toLowerCase());
        if (!file) return;
        const key = picture.replace(/_\d+\.png$/, "") + "/" + archive;
        jobs.push({
          name: picture,
          make: () => {
            if (!made.has(key)) made.set(key, file.arrayBuffer().then((b) => thumbnail(layers(new Uint8Array(b)))));
            return made.get(key);
          },
        });
      };
      if (byId("cz-qpro").checked)
        for (const [part, list] of Object.entries(table.qpro))
          for (const [id, name] of list) fromArchive(`qpro_${part}_${id}.png`, name, (b) => IIDXGfx.qproLayers(b, part));
      if (byId("cz-entry").checked)
        for (const [id, name] of table.entry) fromArchive(`entry_bg_${id}.png`, name, (b) => IIDXGfx.entryLayers(b, id));
      if (byId("cz-badge").checked && v === 33)
        for (const file of badges) {
          const archive = IIDXGfx.ifs(new Uint8Array(await file.arrayBuffer()));
          for (const [name, info] of archive.images)
            if (/^[a-z0-9_]{1,58}$/.test(name) && info.format === "argb8888rev")
              jobs.push({ name: `badge_${name}.png`, make: () => png(IIDXGfx.image(archive, name)) });
        }

      if (!jobs.length) {
        say("Nothing to send: choose the game's data/graphic folder (it holds customize/ and the qp_*.ifs files).");
        return;
      }
      say(`${v}: found ${previews.length} previews and ${archives.size + badges.length} archives: sending ${jobs.length} pictures.`);

      let batch = [], size = 0, saved = 0, skipped = 0;
      const flush = async () => {
        if (!batch.length) return;
        saved += (await post("iidxImportCustomizeImages", { version: v, files: batch })).saved;
        batch = [];
        size = 0;
      };
      for (let i = 0; i < jobs.length; i++) {
        try {
          const bytes = await jobs[i].make();
          if (bytes) {
            const data = base64(bytes);
            batch.push({ name: jobs[i].name, data });
            size += data.length;
          } else skipped++;
        } catch (e) {
          skipped++;
          say(jobs[i].name + ": " + e.message);
        }
        if (size >= BATCH) await flush();
        progress.value = Math.round(((i + 1) / jobs.length) * 100);
      }
      await flush();
      say(`Done: ${saved} pictures saved` + (skipped ? `, ${skipped} without a picture` : "") + ".");
      showStatus();
    } catch (e) {
      say("Stopped: " + e.message);
    } finally {
      start.disabled = false;
    }
  });

  showStatus();
})();
