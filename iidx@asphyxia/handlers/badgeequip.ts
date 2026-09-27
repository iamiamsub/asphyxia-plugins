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

/** badge_equip's index: the bit or digit, but ARENA badges (category 12, flg_id >= 1) go by their id. */
const equipIndex = (category: number, flg_id: number, i: number) => (category == 12 && flg_id >= 1 ? (flg_id - 1) * 15 + i : i);
const key = (category: number, flg_id: number, index: number) => `${category}:${flg_id}:${index}`;

/** The badges the player has that the game can show, in the game's order. */
async function Owned(refid: string) {
  const ids = { ...badgeBaseMap, ...badgeVersionMap[VERSION] };
  const badges = await DB.Find<badge>(refid, { collection: "badge", version: VERSION });
  const out: { key: string; category: number; group: string; name: string }[] = [];
  for (const b of badges) {
    const category = ids[b.category_name];
    if (category === undefined) continue;
    for (const { index, value } of DecodeBadge(category, b.flg_id, b.flg)) {
      const name = BadgeName(category, b.flg_id, index, value);
      if (name !== null) out.push({ key: key(category, b.flg_id, equipIndex(category, b.flg_id, index)), category, group: BADGE_GROUP[category], name });
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
  return send.json({ badges: await Owned(data.refid), slots });
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
