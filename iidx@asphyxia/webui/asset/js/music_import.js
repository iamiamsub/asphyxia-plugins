// Customize Images page, song list: reads the game's music_data.bin (or music_omni.bin) chosen in
// the browser and sends [music id, version, title, 10 chart levels] per song to the server, which
// chooses today's pick and other songs from it.
(function () {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const input = byId("ml-file"), start = byId("ml-start"), log = byId("ml-log"), version = byId("ml-version");

  // entry layouts: 32 and later (UTF-16 titles) and 27..31 (Shift-JIS titles)
  const WIDE = { size: 0x7f8, title: 0x100, encoding: "utf-16le", version: 0x3dc, levels: 0x3ec, id: 0x67c };
  const NARROW = { size: 0x52c, title: 0x40, encoding: "shift_jis", version: 0x118, levels: 0x120, id: 0x3b0 };

  /**
   * A file without its header (music_omni.bin): the entries fill its end and the index before them
   * holds each song's entry number at its music id. Only the true count makes the two agree.
   */
  function findTable(bytes, view) {
    for (let count = 1; 16 + count * WIDE.size <= bytes.length; count++) {
      const start = bytes.length - count * WIDE.size;
      if ((start - 16) % 4) continue;
      const slots = (start - 16) / 4;
      let ok = true;
      for (let n = 0; n < count && ok; n++) {
        const id = view.getUint32(start + n * WIDE.size + WIDE.id, true);
        ok = id < slots && view.getInt32(16 + id * 4, true) === n;
      }
      if (ok) return { count, start, layout: WIDE };
    }
    throw new Error("this is not a music_data.bin");
  }

  function parse(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let table;
    if (bytes.length >= 16 && String.fromCharCode(...bytes.subarray(0, 4)) === "IIDX") {
      const ver = view.getUint32(4, true);
      if (ver < 27 || ver === 80) throw new Error("data version " + ver + " is not supported (27 and later)");
      const layout = ver >= 32 ? WIDE : NARROW;
      const count = view.getUint16(8, true);
      const slots = ver >= 32 ? view.getUint32(12, true) : view.getUint32(10, true);
      const start = 16 + slots * (ver >= 32 ? 4 : 2);
      if (start + count * layout.size !== bytes.length) throw new Error("the file size does not match (broken or unknown format)");
      table = { count, start, layout };
    } else table = findTable(bytes, view);

    const { count, start, layout } = table, decoder = new TextDecoder(layout.encoding);
    const songs = [];
    for (let n = 0; n < count; n++) {
      const e = start + n * layout.size;
      const title = decoder.decode(bytes.subarray(e, e + layout.title)).split("\0")[0].trim();
      songs.push([view.getUint32(e + layout.id, true), view.getUint16(e + layout.version, true), title, Array.from(bytes.subarray(e + layout.levels, e + layout.levels + 10))]);
    }
    return songs;
  }

  const say = (text) => {
    log.style.display = "";
    log.textContent += text + "\n";
  };

  input.addEventListener("change", () => {
    byId("ml-file-name").textContent = input.files.length ? input.files[0].name : "No file chosen";
    start.disabled = !input.files.length;
  });

  // where each version reads its songs (32 reads info/0, whose info/1 holds 31's)
  const FOLDER = { 31: "data/info/1", 32: "data/info/0", 33: "data/info/1" };
  const showPath = () => (byId("ml-path").textContent = FOLDER[version.value] + "/music_data.bin");
  version.addEventListener("change", showPath);
  showPath();

  start.addEventListener("click", async () => {
    start.disabled = true;
    log.textContent = "";
    try {
      const songs = parse(new Uint8Array(await input.files[0].arrayBuffer()));
      const newest = Math.max(...songs.map((s) => s[1]));
      if (newest != Number(version.value))
        throw new Error(`this file is ${newest}'s song list, not ${version.value}'s: choose ${FOLDER[version.value]}/music_data.bin of ${version.value}`);
      const res = await fetch("/emit/iidxImportMusicList", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: Number(version.value), songs }),
      });
      if (!res.ok) throw new Error(res.status + " " + (await res.text()));
      say(`${version.value}: ${(await res.json()).saved} songs saved.`);
    } catch (e) {
      say("Stopped: " + e.message);
    } finally {
      start.disabled = false;
    }
  });
})();
