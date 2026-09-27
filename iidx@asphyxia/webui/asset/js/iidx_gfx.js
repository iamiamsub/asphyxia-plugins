// Reads beatmania IIDX IFS archives in the browser (and in node, for testing): the binary XML
// (kbin) manifest, the texture list and avslz (LZ77) compressed argb8888rev images. Enough to
// make QPro thumbnails from the game's own files; the same rules as ifstools / kbinxml.
(function (root) {
  "use strict";

  // ---- kbin (binary XML) -------------------------------------------------------------------

  const SIXBIT = "0123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

  // element size and signedness by type letter
  const KIND = { b: [1, "Int8"], B: [1, "Uint8"], h: [2, "Int16"], H: [2, "Uint16"], i: [4, "Int32"],
    I: [4, "Uint32"], q: [8, "BigInt64"], Q: [8, "BigUint64"], f: [4, "Float32"], d: [8, "Float64"] };

  // node type -> [type letter, count] (count -1 = sized: bin / str)
  const TYPES = { 2: ["b", 1], 3: ["B", 1], 4: ["h", 1], 5: ["H", 1], 6: ["i", 1], 7: ["I", 1], 8: ["q", 1],
    9: ["Q", 1], 10: ["B", -1], 11: ["B", -1], 12: ["I", 1], 13: ["I", 1], 14: ["f", 1], 15: ["d", 1],
    48: ["b", 16], 49: ["B", 16], 50: ["h", 8], 51: ["H", 8], 52: ["b", 1], 53: ["b", 2], 54: ["b", 3],
    55: ["b", 4], 56: ["b", 16] };
  const TUPLE = "bBhHiIqQfd";
  for (let t = 16; t <= 45; t++) TYPES[t] = [TUPLE[(t - 16) % 10], 2 + Math.floor((t - 16) / 10)];

  const ATTR = 46, NODE_END = 190, END_SECTION = 191, VOID = 1, STR = 11;

  /** Parses kbin into { name, attrs, value, children } (value: array of numbers, a string or bytes). */
  function kbin(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes[0] !== 0xa0) throw new Error("not binary XML");
    const packed = bytes[1] === 0x42;
    const nodeEnd = dv.getUint32(4) + 8;
    const align = (x) => (x + 3) & ~3;
    let np = 8, dp = nodeEnd + 4, bp = nodeEnd, wp = nodeEnd;

    const name = () => {
      const len = bytes[np++];
      if (!packed) {
        const n = (len & ~64) + 1, s = String.fromCharCode(...bytes.subarray(np, np + n));
        np += n;
        return s;
      }
      let s = "";
      for (let i = 0; i < len; i++) {
        let v = 0;
        for (let b = i * 6; b < i * 6 + 6; b++) v = (v << 1) | ((bytes[np + (b >> 3)] >> (7 - (b & 7))) & 1);
        s += SIXBIT[v];
      }
      np += Math.ceil((len * 6) / 8);
      return s;
    };
    const read = (at, letter, n) => {
      const [size, kind] = KIND[letter], out = [];
      for (let k = 0; k < n; k++) out.push(Number(dv["get" + kind](at + k * size)));
      return out;
    };
    const sized = () => {
      const size = dv.getUint32(dp), out = bytes.subarray(dp + 4, dp + 4 + size);
      dp = align(dp + 4 + size);
      return out;
    };
    const text = (b) => new TextDecoder().decode(b[b.length - 1] === 0 ? b.subarray(0, b.length - 1) : b);

    const top = { name: "", attrs: {}, children: [] };
    let node = top;
    const parents = [];
    for (;;) {
      while (bytes[np] === 0) np++;
      const raw = bytes[np++], isArray = raw & 64, type = raw & ~64;
      if (type === END_SECTION) break;
      if (type === NODE_END) { node = parents.pop() || top; continue; }
      const nm = name();
      if (type === ATTR) { node.attrs[nm] = text(sized()); continue; }
      const child = { name: nm, attrs: {}, children: [] };
      node.children.push(child);
      parents.push(node);
      node = child;
      if (type === VOID) continue;
      const t = TYPES[type];
      if (!t) throw new Error("kbin node type " + type);
      const [letter, count] = t;
      if (count === -1) {
        const b = sized();
        child.value = type === STR ? text(b) : b;
      } else if (isArray) {
        const total = dv.getUint32(dp);
        child.value = read(dp + 4, letter, total / KIND[letter][0]);
        dp = align(dp + 4 + total);
      } else {
        if (bp % 4 === 0) bp = dp;
        if (wp % 4 === 0) wp = dp;
        const size = KIND[letter][0] * count;
        if (size === 1) { child.value = read(bp, letter, count); bp += 1; }
        else if (size === 2) { child.value = read(wp, letter, count); wp += 2; }
        else { child.value = read(dp, letter, count); dp = align(dp + size); }
        const trailing = Math.max(bp, wp);
        if (dp < trailing) dp = align(trailing);
      }
    }
    return top.children[0];
  }

  // ---- avslz (LZ77) --------------------------------------------------------------------------

  function lz77(input, size) {
    const out = new Uint8Array(size);
    let i = 0, o = 0;
    for (;;) {
      const flag = input[i++];
      for (let bit = 0; bit < 8; bit++) {
        if ((flag >> bit) & 1) { out[o++] = input[i++]; continue; }
        const w = (input[i] << 8) | input[i + 1];
        i += 2;
        const back = w >> 4;
        let len = (w & 0x0f) + 3;
        if (back === 0) return out.subarray(0, o);
        for (; len > 0; len--, o++) out[o] = back > o ? 0 : out[o - back];
      }
    }
  }

  // ---- IFS ------------------------------------------------------------------------------------

  const unescape = (n) => {
    n = n.replace(/_E/g, ".").replace(/__/g, "_");
    return /^_\d/.test(n) ? n.slice(1) : n;
  };

  /** Opens an IFS: files by path ("tex/<md5>") and the images of tex/texturelist.xml by name. */
  function ifs(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (dv.getUint32(0) !== 0x6cad8f89) throw new Error("not an IFS");
    const version = dv.getUint16(4), blob = dv.getUint32(16);
    const manifest = kbin(bytes.subarray(version > 1 ? 36 : 20, blob));

    const files = new Map();
    const walk = (n, path) => {
      for (const c of n.children) {
        const p = path + unescape(c.name);
        // a file is [offset, size, time] with no children; a folder holds its time and children
        if (Array.isArray(c.value) && c.value.length === 3 && !c.children.length)
          files.set(p, bytes.subarray(blob + c.value[0], blob + c.value[0] + c.value[1]));
        else if (c.name !== "_info_") walk(c, p + "/");
      }
    };
    walk(manifest, "");

    const images = new Map();
    const list = files.get("tex/texturelist.xml");
    if (list) {
      const tl = kbin(list);
      const compress = tl.attrs.compress;
      for (const tex of tl.children.filter((c) => c.name === "texture"))
        for (const img of tex.children.filter((c) => c.name === "image")) {
          const rect = (n) => img.children.find((c) => c.name === n).value.map((v) => v >> 1);
          images.set(img.attrs.name, { format: tex.attrs.format, compress, imgrect: rect("imgrect"), uvrect: rect("uvrect") });
        }
    }
    return { files, images };
  }

  // ---- MD5 (tex/ names its images by the MD5 of their names; browsers have no MD5) -----------

  const K = Array.from({ length: 64 }, (v, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];

  function md5(text) {
    const msg = new TextEncoder().encode(text);
    const n = ((msg.length + 8) >> 6) + 1, words = new Uint32Array(n * 16);
    for (let i = 0; i < msg.length; i++) words[i >> 2] |= msg[i] << ((i % 4) * 8);
    words[msg.length >> 2] |= 0x80 << ((msg.length % 4) * 8);
    words[n * 16 - 2] = msg.length * 8;
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let blk = 0; blk < n * 16; blk += 16) {
      let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        const r = i >> 4;
        let f, g;
        if (r === 0) { f = (b & c) | (~b & d); g = i; }
        else if (r === 1) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (r === 2) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const t = d;
        d = c;
        c = b;
        const x = (a + f + K[i] + words[blk + g]) >>> 0, s = S[r * 4 + (i % 4)];
        b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0;
        a = t;
      }
      a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
    }
    let hex = "";
    for (const v of [a0, b0, c0, d0]) for (let i = 0; i < 4; i++) hex += ((v >>> (i * 8)) & 255).toString(16).padStart(2, "0");
    return hex;
  }

  /** One image of an opened IFS as RGBA, cropped to its uvrect (the image without its 1px border). */
  function image(archive, name) {
    const info = archive.images.get(name);
    let data = archive.files.get("tex/" + md5(name));
    if (!info || !data) return null;
    if (info.format !== "argb8888rev") throw new Error(name + ": format " + info.format);
    const [x1, x2, y1, y2] = info.imgrect, w = x2 - x1, h = y2 - y1;
    if (info.compress === "avslz") {
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const size = dv.getUint32(0), csize = dv.getUint32(4);
      // without the header the data is stored as is, the 8 bytes moved to the end
      data = data.length === csize + 8 ? lz77(data.subarray(8), size) : concat(data.subarray(8), data.subarray(0, 8));
    }
    if (data.length < w * h * 4) throw new Error(name + ": " + data.length + " bytes for " + w + "x" + h);
    const [u1, u2, v1, v2] = info.uvrect, cw = u2 - u1, ch = v2 - v1, ox = u1 - x1, oy = v1 - y1;
    const rgba = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const s = ((y + oy) * w + (x + ox)) * 4, d = (y * cw + x) * 4;
        rgba[d] = data[s + 2]; rgba[d + 1] = data[s + 1]; rgba[d + 2] = data[s]; rgba[d + 3] = data[s + 3];
      }
    return { width: cw, height: ch, rgba };
  }

  const concat = (a, b) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };

  // QPro parts: the images a thumbnail is made of (drawn in order); "row" lays them side by side.
  const QPRO = {
    head: { images: ["qp_head_b", "qp_head_f"] },
    hair: { images: ["qp_hair_b", "qp_hair_f"] },
    face: { images: ["qp_face_neutral"] },
    hand: { images: ["qp_hand_r", "qp_hand_l"], row: true },
    body: { images: ["qp_body_b", "qp_body_f"] },
    back: { images: ["qp_bg"] },
  };

  /**
   * A picture's layers from an IFS: [{ width, height, rgba }] and whether to lay them in a row. The
   * images asked for when all are there, else the largest one (QPro parts with their own animation
   * name their images differently).
   */
  function layers(bytes, want, row) {
    const archive = ifs(bytes);
    if (want.every((n) => archive.images.has(n)))
      return { row: !!row, layers: want.map((n) => image(archive, n)).filter(Boolean) };
    const area = ([n, i]) => (i.imgrect[1] - i.imgrect[0]) * (i.imgrect[3] - i.imgrect[2]);
    const largest = [...archive.images].filter(([n, i]) => i.format === "argb8888rev").sort((a, b) => area(b) - area(a))[0];
    return { row: false, layers: largest ? [image(archive, largest[0])].filter(Boolean) : [] };
  }

  /** One QPro part (qp_*_<part>.ifs). */
  const qproLayers = (bytes, part) => layers(bytes, QPRO[part].images, QPRO[part].row);

  /** An entry background (entry_card<id>.ifs): its 1P card, the 2P one fades the other way. */
  const entryLayers = (bytes, id) => layers(bytes, ["entry_card1p_" + String(id).padStart(3, "0")]);

  const api = { kbin, lz77, ifs, image, md5, qproLayers, entryLayers, QPRO };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.IIDXGfx = api;
})(this);
