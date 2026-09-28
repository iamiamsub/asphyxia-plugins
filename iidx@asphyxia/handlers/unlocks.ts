/// <reference lib="es2020.bigint" />
import { krank } from "../models/krank";
import { tsujigiri } from "../models/tsujigiri";
import { world_tourism } from "../models/worldtourism";
import { IDtoRef } from "../util";

// Unlock flags of IIDX 33 (bm2dx 2026081900): pc.get secret flg1..5, leggendaria flg1..2 and
// world_tourism_secret_flg flg1..2 (3 x s64 each; the word [2] holds the Sparkle Shower songs). They are
// sent all set (everything unlocked), except the bits some events read to decide that their reward is
// still to come; with those set the events never open or skip their unlock (spec-unlock-flags.md):
//   CYBER LOADER       the result window, points and boosters need a song not unlocked (all 4 charts)
//   SPARKLE FRUIT LAB  the last song (hidden way in, movie, LAST CONGRATS) needs 33065 ANOTHER locked
//   WORLD TOURISM      a tour closes once its last reward is unlocked (a new song's 4 event chart bits,
//                      an old song's SP LEGGENDARIA)
//   KAIDEN RANK        a K-ELEMENT exchange shows its LEGGENDARIA only when it was locked
//   tsujigiri          beating 理々奈 / 彩葉 shows Medicine of love LEGGENDARIA only when it was locked
// Only one bit each is sent clear, BEGINNER of the new songs (none of them has one, but COLOR BURST) and
// SP of the LEGGENDARIAs, so the charts stay playable; the LEGGENDARIAs are also opened in systemInfo
// music_open (UnlockOpenMusic). The client sets a bit when the player earns it and sends the words in
// pc.save, which are kept; the progress the server keeps (event_v, tours, K-ELEMENTs, defeats) sets it too.

type Flag = "secret" | "legg" | "wt";
interface State {
  vocalo: (i: number) => number; // CYBER LOADER gauge of song i: point_use + 10 x booster_use
  tour: (t: number) => number; // WORLD TOURISM progress
  kExchanged: number; // LEGGENDARIAs exchanged for K-ELEMENTs (3 each, 12 at most)
  tsujigiri: boolean; // 理々奈 (19) or 彩葉 (20) beaten
}
interface Reward {
  flag: Flag;
  flg: number; // 0 = flg1
  bit: number; // in the word [2]
  earned: (s: State) => boolean;
  open?: number; // music id opened in music_open until earned
}

const TOUR_LENGTH = [50, 50, 30, 50, ...Array(12).fill(20), 50]; // data/info/1/world_tourism_define.xml
const TOUR_LEGG = [33058, 12012, 24009, 23087, 28039, 26055, 25006, 22016, 27075, 18006, 17058, 31050, 20082]; // tours 2, 4..15
const K_LEGG = [31049, 15025, 20064, 18008]; // the K-ELEMENT exchange order

const tourDone = (t: number) => (s: State) => s.tour(t) >= TOUR_LENGTH[t];
const REWARDS: Reward[] = [
  // the LEGGENDARIAs first: music_open has room for 15
  ...TOUR_LEGG.map((music, i): Reward => {
    const tour = i == 0 ? 2 : i + 3;
    return { flag: "legg", flg: 1, bit: 2 * i, earned: tourDone(tour), open: music };
  }),
  { flag: "legg", flg: 1, bit: 26, earned: (s) => s.tsujigiri, open: 18053 },
  ...K_LEGG.map((music, i): Reward => ({ flag: "legg", flg: 0, bit: 10 + 2 * i, earned: (s) => s.kExchanged > i, open: music })),
  ...[0, 1, 3, 16].map((tour, i): Reward => ({ flag: "wt", flg: 0, bit: 4 * i, earned: tourDone(tour), ...(tour == 3 && { open: 33094 }) })),
  { flag: "secret", flg: 4, bit: 28, earned: (s) => s.vocalo(0) >= 300 }, // 33053
  { flag: "secret", flg: 4, bit: 32, earned: (s) => s.vocalo(1) >= 500 }, // 33002
  { flag: "secret", flg: 1, bit: 59, earned: () => false }, // 33065: only the client knows
];
const WORDS: Record<Flag, number> = { secret: 5, legg: 2, wt: 2 };

async function State(refid: string, version: number): Promise<State> {
  const vocalo = await DB.FindOne<any>(refid, { collection: "event_1", version, event_data: "sparkle_vocalo" });
  const tours = await DB.Find<world_tourism>(refid, { collection: "world_tourism", version });
  const k = await DB.FindOne<krank>(refid, { collection: "krank", version });
  const t = await DB.FindOne<tsujigiri>(refid, { collection: "tsujigiri", version });
  const n = (v) => Number(v) || 0;
  return {
    vocalo: (i) => n(vocalo?.[`point_use_${i}`]) + 10 * n(vocalo?.[`booster_use_${i}`]),
    tour: (tour) => n(tours.find((w) => w.tour_id == tour)?.progress),
    kExchanged: Math.floor(Math.min(n(k?.element_get) + n(k?.element_append_get), 12) / 3),
    tsujigiri: n(t?.defeat?.[19]) + n(t?.defeat?.[20]) > 0,
  };
}

const s64 = (v: bigint) => BigInt.asIntN(64, v).toString();

/** pc.get: the words of secret / leggendaria / world_tourism_secret_flg, as s64 texts. */
export async function Unlocks(refid: string, version: number, pcdata) {
  const saved = pcdata.unlock33 || {}, state = await State(refid, version);
  const words = {} as Record<Flag, bigint[][]>;
  for (const flag of Object.keys(WORDS) as Flag[])
    words[flag] = Array.from({ length: WORDS[flag] }, (_, f) => [0, 1, 2].map((w) => BigInt(saved[flag]?.[f]?.[w] ?? -1)));
  for (const r of REWARDS) {
    const bit = BigInt(1) << BigInt(r.bit), word = words[r.flag][r.flg];
    if (r.earned(state)) word[2] |= bit;
    else if (!saved[r.flag]) word[2] &= ~bit; // nothing saved yet: the default
  }
  const text = (flag: Flag) => words[flag].map((ws) => ws.map(s64).join(" "));
  return { secret: text("secret"), legg: text("legg"), wt: text("wt") };
}

/** pc.save: keeps the words the client sends (it sets the bits the player earns). */
export function SaveUnlocks(pcdata, data) {
  const nodes: Record<Flag, string> = { secret: "secret", legg: "leggendaria", wt: "world_tourism_secret_flg" };
  pcdata.unlock33 = pcdata.unlock33 || {};
  for (const flag of Object.keys(nodes) as Flag[]) {
    const node = $(data).element(nodes[flag]);
    if (_.isNil(node)) continue;
    const flgs = Array.from({ length: WORDS[flag] }, (_, f) => node.bigints(`flg${f + 1}`));
    if (flgs.every((w) => w && w.length == 3)) pcdata.unlock33[flag] = flgs.map((w) => w.map(String));
  }
}

/** A row of pc.save music_unlock_log: what the game unlocked in the credit (CSecretGameData::AddUnlockRecord). */
export interface music_unlock_log {
  collection: "music_unlock_log";
  version: number;
  time: number; // unix seconds, when the pc.save came
  music_id: number;
  unlock_type: number;
  difficulty: number;
  event_type: number;
  play_num: number;
}

/** pc.save: keeps the unlock log rows (up to 30 a credit), for the record only. */
export async function SaveUnlockLog(refid: string, version: number, data) {
  const time = Math.floor(Date.now() / 1000);
  for (const row of $(data).elements("music_unlock_log")) {
    const a = row.attr(), n = (k: string) => Number(a[k]) || 0;
    await DB.Insert<music_unlock_log>(refid, {
      collection: "music_unlock_log", version, time,
      music_id: n("music_id"), unlock_type: n("unlock_type"), difficulty: n("difficulty"), event_type: n("event_type"), play_num: n("play_num"),
    });
  }
}

/** systemInfo: the rewards not earned yet by the players in the request, opened in music_open (kind 0). */
export async function UnlockOpenMusic(version: number, data) {
  const open = new Set<number>();
  for (const id of [$(data).number("iidx_id_0", 0), $(data).number("iidx_id_1", 0)]) {
    const refid = id > 0 ? await IDtoRef(id) : null;
    if (!refid) continue;
    const state = await State(refid, version);
    const pcdata = await DB.FindOne<any>(refid, { collection: "pcdata", version });
    const saved = pcdata?.unlock33 || {};
    for (const r of REWARDS) {
      if (!r.open || r.earned(state)) continue;
      const word = saved[r.flag]?.[r.flg]?.[2];
      if (word === undefined || !((BigInt(word) >> BigInt(r.bit)) & BigInt(1))) open.add(r.open);
    }
  }
  return [...REWARDS.map((r) => r.open).filter((m) => open.has(m))]; // in REWARDS order
}
