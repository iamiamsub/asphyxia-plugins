/// <reference lib="es2020.bigint" />
import { badge, badge_equip, badgeBaseMap, badgeVersionMap } from "../models/badge";

// The badges a player has and the 5 slots on the profile (IIDX 33, bm2dx 2026081900).
// badge_flg packs one badge per bit (visitor, iidx_exam) or per decimal digit or two (the rest); the
// value there is the badge's grade (A/AA/AAA, 1/10/25/50/100 charts, ...), 0 = not had.
// badge_equip names a badge by category_id, badge_flg_id and its bit or digit (index). The game
// equips only badges the player has, and does not check that index < stride.
// The WebUI lists the badges from here and sets the slots (the game cannot change them).

const VERSION = 33;

type Spec = { digits: number; stride: number }; // digits 0 = bits
const SPEC: Record<number, Spec> = {
  0: { digits: 1, stride: 3 }, 1: { digits: 1, stride: 6 }, 2: { digits: 2, stride: 6 },
  3: { digits: 1, stride: 2 }, 4: { digits: 1, stride: 1 }, 5: { digits: 1, stride: 10 },
  6: { digits: 0, stride: 58 }, 7: { digits: 2, stride: 6 }, 8: { digits: 2, stride: 1 },
  9: { digits: 1, stride: 1 }, 10: { digits: 0, stride: 7 }, 11: { digits: 1, stride: 20 },
  12: { digits: 2, stride: 2 }, // badge_flg_id 0: ARENA class
  2000: { digits: 1, stride: 8 }, 3301: { digits: 1, stride: 1 },
};
const ARENA: Spec = { digits: 1, stride: 15 }; // category 12, badge_flg_id 1

/** The bits or digits of a flg that are set: [{ index, value }]. flg is an s64 (as text). */
export function DecodeBadge(category: number, flg_id: number, flg: number | string) {
  const spec = category == 12 && flg_id != 0 ? ARENA : SPEC[category];
  let v: bigint;
  try { v = BigInt(flg); } catch { return []; }
  if (_.isNil(spec)) return [];

  const out: { index: number; value: number }[] = [];
  for (let i = 0; i < spec.stride; i++) {
    const value = spec.digits == 0
      ? Number((v >> BigInt(i)) & BigInt(1))
      : Number((v / BigInt(10) ** BigInt(i * spec.digits)) % BigInt(10) ** BigInt(spec.digits));
    if (value > 0) out.push({ index: i, value });
  }
  return out;
}

const STYLE = ["SP", "DP"];
const COUNT = [1, 10, 25, 50, 100];
const LAMP = ["ASSIST CLEAR", "EASY CLEAR", "CLEAR", "HARD CLEAR", "EX HARD CLEAR", "FULL COMBO"];
const DAN = ["七級", "六級", "五級", "四級", "三級", "二級", "一級", "初段", "二段", "三段", "四段", "五段", "六段", "七段", "八段", "九段", "十段", "中伝", "皆伝"];
const PREF = ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県",
  "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県",
  "宮崎県", "鹿児島県", "沖縄県"];
const AREA = ["北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州", "沖縄"];
const RADAR_TYPE = ["NOTES", "PEAK", "SCRATCH", "SOF-LAN", "CHARGE", "CHORD"];
const RADAR_RANK = ["ROOKIE", "NORMAL", "BRONZE", "SILVER", "GOLD", "EMERALD", "DIAMOND", "PLATINUM", "MASTER", "RESIDENT"];
const TRAINING = ["DJ TRAINING (blue)", "DJ TRAINING (yellow)", "DJ TRAINING (red)", "DJ TRAINING (purple)", "BLACK", "EMERALD", "DIAMOND", "PLATINUM", "MASTER", "RESIDENT"];
const BPL_TEAM = [
  ["APINA VRAMeS", "GiGO", "GAME PANIC", "SILK HAT", "SUPERNOVA Tohoku", "TAITO STATION Tradz", "ROUND1", "レジャーランド"],
  ["APINA VRAMeS", "GiGO", "GAME PANIC", "SILK HAT", "TAITO STATION Tradz", "ROUND1", "レジャーランド"],
];
const ARENA_BADGE: [string, number[]][] = [ // SP / DP pairs, the count of each grade
  ["WIN", [1, 5, 10, 30, 50]], ["連勝", [3, 5, 10, 15, 20]], ["完全勝利", [1, 5, 10, 30, 50]], ["逆転", [1, 10, 30, 50, 100]],
];

export const BADGE_GROUP: Record<number, string> = {
  0: "DJ LEVEL", 1: "Clear lamp", 2: "段位", 3: "STEP UP", 4: "今日のイチオシ", 5: "WEEKLY RANKING", 6: "行脚",
  7: "NOTES RADAR", 8: "DJ TRAINING", 9: "辻斬り", 10: "全国実力テスト", 11: "BPL SUPPORTERS", 12: "ARENA",
  2000: "ONE MORE EXTRA", 3301: "SPARKLE FRUIT LAB",
};

/** The badge's name, or null for one the game cannot show (no picture, or a grade out of its table). */
export function BadgeName(category: number, flg_id: number, i: number, v: number): string | null {
  const version = 30 + flg_id;
  switch (category) {
    case 0: return v <= 5 ? `${STYLE[Math.floor(flg_id / 12)]} ☆${flg_id % 12 + 1} ${["A", "AA", "AAA"][i]} ×${COUNT[v - 1]}` : null;
    case 1: return v <= 5 ? `${STYLE[Math.floor(flg_id / 12)]} ☆${flg_id % 12 + 1} ${LAMP[i]} ×${COUNT[v - 1]}` : null;
    case 2: return v <= 19 ? `${version} ${STYLE[Math.floor(i / 3)]} ${DAN[v - 1]}${["", " -EX-", " -極-"][i % 3]}` : null;
    case 3: return v <= 5 ? `${version} ${i == 0 ? `stage clear ${["1", "3", "5", "7", "ALL"][v - 1]}` : `missions ${COUNT[v - 1]}`}` : null;
    case 4: return v <= 5 ? `${COUNT[v - 1]} times` : null;
    case 5: return v <= 5 ? `${STYLE[Math.floor(i / 5)]} ${["W", "B", "S", "G", "P"][i % 5]} ×${[1, 3, 5, 7, 10][v - 1]}` : null;
    case 6: return i >= 1 && i <= 47 ? `${version} ${PREF[i - 1]}` : i <= 56 && i >= 48 ? `${version} ${AREA[i - 48]}制覇` : i == 57 ? `${version} 全国制覇` : null;
    case 7: return v <= 10 ? `${STYLE[flg_id]} ${RADAR_TYPE[i]} ${RADAR_RANK[v - 1]}` : null;
    case 8: return v <= 10 ? `${STYLE[flg_id]} ${TRAINING[v - 1]}` : null;
    case 9: return v <= 5 ? `${v} 撃破` : null;
    case 10: return i >= 4 ? `第${i}回` : null; // no pictures for 1..3
    case 11: return v >= 3 && v <= 5 ? `S${flg_id + 3} ${BPL_TEAM[flg_id == 0 ? 0 : 1][i]} ${["A", "AA", "AAA"][v - 3]}` : null;
    case 12:
      if (flg_id == 0) return v <= 20 ? `${STYLE[i]} class ${"DCBA"[Math.floor((v - 1) / 5)]}${5 - (v - 1) % 5}` : null;
      if (v > 5) return null;
      if (i < 8) return `${ARENA_BADGE[i >> 1][0]} ${ARENA_BADGE[i >> 1][1][v - 1]} ${STYLE[i % 2]}`;
      if (i < 10) return v >= 3 ? `全ステージ ${["HARD", "EX HARD", "FULL COMBO"][v - 3]} ${STYLE[i % 2]}` : null;
      if (i == 10) return `ミッションボーナス ${[10, 50, 100, 300, 500][v - 1]}`;
      if (i == 11 || i == 12) return v >= 3 ? `${i == 11 ? "以心伝心" : "同窓会"} ${v - 1}` : null;
      return ["BPL PRO マッチング", "スタッフマッチング"][i - 13];
    case 2000: return i == 6 ? "33 SCORE" : i == 7 ? "33 MISS COUNT" : i <= 3 ? `${i < 2 ? 31 : 32} (${i % 2 + 1})` : null;
    case 3301: return v <= 5 ? (v == 5 ? "complete" : `${v} rooms`) : null;
  }
  return null;
}

// The badge's picture as the game lays it out (graphic/1/badge.ifs afp, frame 0): [texture, left,
// top, scale] in the 180x180 badge, drawn in order. The body parts are placed in a 104x120 body at
// (38, 30), then the frame, then the version logo for the kinds that show one. The WebUI draws the
// textures the Customize Images page imported (badge_<texture>.png); the animations are left out.
type Layer = [string, number, number, number?];
const LAMP_TEX = ["assist", "easy", "normal", "hard", "exhard", "fullcombo"];
const RADAR_TEX = ["notes", "peak", "scratch", "soflan", "charge", "chord"];
const BPL_TEX = [
  ["apina", "gigo", "gamepanic", "silkhat", "supernova", "trads", "round1", "leisureland"],
  ["apina", "gigo", "gamepanic", "silkhat", "trads", "round1", "leisureland"],
];
const ARENA_TEX = ["win", "winningstreak", "victory", "counter"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const ps = (style: number, x: number, y: number): Layer => [style ? "playstyle_dp" : "playstyle_sp", x, y];
const level = (lv: number, tens: [number, number], ones: [number, number]): Layer[] => // shown as 2 digits, 5 as 05
  [[`music_lv_${Math.floor(lv / 10)}`, ...tens], [`music_lv_${lv % 10}`, ...ones]];

function framed(body: Layer[], frame: number, version?: number): Layer[] {
  const out: Layer[] = body.map(([t, x, y, s]): Layer => [t, x + 38, y + 30, s]);
  out.push([`frame_${Math.min(5, Math.max(1, frame))}`, 0, 0]);
  if (version) out.push(["title_base", 40, 135], [`version_${version}`, 40, 135]);
  return out;
}

export function BadgeArt(category: number, flg_id: number, i: number, v: number): Layer[] {
  switch (category) {
    case 0: {
      const lv = flg_id % 12 + 1;
      return framed([["dj_lv_bg", 0, 0], [`dj_lv_${["a", "aa", "aaa"][i]}`, 3, 47], ps(Math.floor(flg_id / 12), 29, 82), ...level(lv, [27, 21], [51, 21])], v);
    }
    case 1: {
      const lv = flg_id % 12 + 1;
      return framed([[`clearlamp_${LAMP_TEX[i]}`, -1, 0], ...level(lv, [26, 22], [50, 22]), ps(Math.floor(flg_id / 12), 28, 84)], v);
    }
    case 2: {
      const body: Layer[] = [[v <= 7 ? "dan_kyu" : v <= 15 ? "dan_dan" : v <= 17 ? "dan_9_10dan" : v == 18 ? "dan_chuden" : "dan_kaiden", 0, 0]];
      if (v <= 17) body.push([v <= 7 ? `dan_${8 - v}kyu` : `dan_${v - 7}dan`, 7, 26]);
      body.push(ps(Math.floor(i / 3), 27, 72));
      if (i % 3) body.push([i % 3 == 1 ? "ex_effect" : "kiwami_effect", 28, 9]);
      return framed(body, v <= 7 ? 1 : v <= 15 ? 2 : v <= 17 ? 3 : v == 18 ? 4 : 5, 30 + flg_id);
    }
    case 3: {
      const num = i == 0 ? ["001", "003", "005", "007", "all"][v - 1] : ["001", "010", "025", "050", "100"][v - 1];
      return framed([[i == 0 ? "stepup_stage" : "stepup_mission", -1, 0], [`stepup_num_${num}`, 17, 77]], v, 30 + flg_id);
    }
    case 4: return framed([["today_musicpack", 0, 0]], v);
    case 5: return framed([[`weekly_${pad2(i % 5 + 1)}`, -1, 0], ps(Math.floor(i / 5), 28, 84)], v);
    case 6: {
      const center = i == 1 ? "text_center" : i <= 47 ? `text_angya_${pad2(i - 1)}` : `text_area_${pad2(i - 47)}`;
      const lower = i <= 47 ? "text_angya" : i <= 56 ? "text_seiha" : "text_seiha_all";
      return framed([["visit", 0, 0], [lower, 2, 61], [center, 2, 31]], i <= 47 ? 3 : i <= 56 ? 4 : 5, 30 + flg_id);
    }
    case 7: return [[`radarrank_${v}`, 0, -2], [`radartype_${RADAR_TEX[i]}`, 64 - 65 * 2 / 3, 164 - 9 * 2 / 3, 2 / 3], ps(flg_id, 108, 151)];
    case 8: return [[`dj_training_${pad2(v)}`, 0, -1], ps(flg_id, 65, 151)];
    case 9: return framed([["tsujigiri", 0, 0], [`tsujigiri_${pad2(v)}`, 6, 52]], v);
    case 10: return framed([[`proficiency_test_${pad2(i)}`, 0, 0]], 5);
    case 11: return framed([[`${["bpl", "bpls4", "bpls5"][flg_id]}_${BPL_TEX[flg_id == 0 ? 0 : 1][i]}_${["a", "aa", "aaa"][v - 3]}`, 0, 0]], v);
    case 12:
      if (flg_id == 0) {
        const icon = `class_icon_${"dcba"[Math.floor((v - 1) / 5)]}${5 - (v - 1) % 5}`;
        return framed([["arena_class", -1, 0], [icon, 52 - 86 / 2, 57 - 24 / 2, 0.5], ps(i, 28, 73)], v <= 5 ? 1 : v <= 10 ? 2 : v <= 15 ? 3 : v <= 19 ? 4 : 5);
      }
      if (i < 2) return framed([["arena_base", -1, 0], ["arena_win", 0, 0], ps(i % 2, 28, 73)], v);
      if (i < 8) return framed([[`arena_${ARENA_TEX[i >> 1]}`, -1, 0], ps(i % 2, 28, i >> 1 == 2 ? 71 : 73)], v);
      if (i < 10) return framed([[`arena_dga_${["hard", "exh", "fullcombo"][v - 3]}`, 0, 0], ps(i % 2, 28, 84), ["arena_title", 52 - 60 * 0.8, 31 - 20 * 0.8, 0.8]], v);
      if (i == 12) return framed([["arena_reunion", -1, 0], [`arena_reunion_${v - 1}p`, 2, 62]], v);
      return framed([[["arena_mission", "arena_telepathy", "", "arena_pro", "arena_staff_matching"][i - 10], -1, 0]], v);
    case 2000: {
      const tex = i == 6 ? "33_1more_sc_02" : i == 7 ? "33_1more_mc_02" : `${i < 2 ? 31 : 32}_1more_${pad2(i % 2 + 1)}`;
      return framed([[tex, 0, 0]], v, i < 2 ? 31 : i < 4 ? 32 : 33);
    }
    case 3301: return framed([["iidx33_ev1", 0, 0]], v, 33);
  }
  return [];
}

/** badge_equip's index: the bit or digit, but ARENA badges (category 12, flg_id >= 1) go by their id. */
const equipIndex = (category: number, flg_id: number, i: number) => (category == 12 && flg_id >= 1 ? (flg_id - 1) * 15 + i : i);
const key = (category: number, flg_id: number, index: number) => `${category}:${flg_id}:${index}`;

/** The badges the player has that the game can show, in the game's order. */
async function Owned(refid: string) {
  const ids = { ...badgeBaseMap, ...badgeVersionMap[VERSION] };
  const badges = await DB.Find<badge>(refid, { collection: "badge", version: VERSION });
  const out: { key: string; category: number; group: string; name: string; art: Layer[] }[] = [];
  for (const b of badges) {
    const category = ids[b.category_name];
    if (category === undefined) continue;
    for (const { index, value } of DecodeBadge(category, b.flg_id, b.flg)) {
      const name = BadgeName(category, b.flg_id, index, value);
      if (name === null) continue;
      const art = BadgeArt(category, b.flg_id, index, value).map(([t, x, y, s]): Layer => (s ? [t, +x.toFixed(2), +y.toFixed(2), +s.toFixed(4)] : [t, x, y]));
      out.push({ key: key(category, b.flg_id, equipIndex(category, b.flg_id, index)), category, group: BADGE_GROUP[category], name, art });
    }
  }
  const order = (k: string) => k.split(":").map(Number);
  return out.sort((a, b) => {
    const [x, y] = [order(a.key), order(b.key)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
}

/** WebUI: the badges to choose from and the 5 slots (a key or ""). */
export const getBadgeEquip = async (data, send: WebUISend) => {
  const equip = await DB.Find<badge_equip>(data.refid, { collection: "badge_equip", version: VERSION });
  const slots = ["", "", "", "", ""];
  for (const e of equip) if (e.slot >= 0 && e.slot < 5) slots[e.slot] = key(e.category_id, e.badge_flg_id, e.index);
  const pictures = IO.Exists(`webui/asset/customize/${VERSION}/badge_frame_1.png`);
  return send.json({ badges: await Owned(data.refid), slots, pictures });
};

/** WebUI: slot0..slot4 = a key from getBadgeEquip, "" to clear; badges not had and repeats are dropped. */
export const updateBadgeEquip = async (data) => {
  const owned = new Set((await Owned(data.refid)).map((b) => b.key));
  const used = new Set<string>();
  for (let slot = 0; slot < 5; slot++) {
    await DB.Remove<badge_equip>(data.refid, { collection: "badge_equip", version: VERSION, slot });
    const k = String(data[`slot${slot}`] ?? "");
    if (!owned.has(k) || used.has(k)) continue;
    used.add(k);
    const [category_id, badge_flg_id, index] = k.split(":").map(Number);
    await DB.Insert<badge_equip>(data.refid, { collection: "badge_equip", version: VERSION, slot, category_id, badge_flg_id, index });
  }
};
