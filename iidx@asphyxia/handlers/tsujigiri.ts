import { score } from "../models/score";
import { tsujigiri } from "../models/tsujigiri";
import { Hash, JstDate, Random, ReftoProfile, ReftoQPRO } from "../util";
import { MusicList, MusicPool } from "./musiclist";

// Tsujigiri battle (辻斬り, IIDX 33, bm2dx 2026081900), with the option tsujigiri_disp and a target
// graph on. Normal tsujigiri: on a chart with a shop top, the rivals are music.appoint
// <tsujigiri_data> ranking (the EX ranking of the chart, ranking_num 0 = 1st, from pre_my_data up);
// the client counts the rivals passed and saves the total. Hidden characters: pc.get
// <tsujigiri_hidden_chara> appearance_info gives 3 songs and 3 characters (0..29) for the day; on
// those songs (any chart) music.appoint <tsujigiri_hidden_chara_data score enable_score> is the
// character's EX, beaten the moment the play reaches it; defeat_flg keeps which of the 3 are beaten
// that day and total_defeat how often each character was. Days change at midnight JST.
// The client has no rule for the table or the characters' scores: the table is drawn with the date
// as the seed, and a character plays close to the player's best on the chart (or the server's top
// on it, or 100 x level).

const CHARAS = 30;
const empty = (): number[] => Array(CHARAS).fill(0);

/** The day's table: songs and characters, the same for everyone. */
export async function TodayTable(version: number) {
  const appearance_id = JstDate();
  const random = Random(appearance_id ^ 0x7473756a), pool = await MusicPool(version);
  const music: number[] = [], chara: number[] = [];
  while (music.length < 3 && music.length < pool.length) {
    const id = pool[Math.floor(random() * pool.length)];
    if (!music.includes(id)) music.push(id);
  }
  while (music.length < 3) music.push(-1);
  // the 『辻斬り隠れキャラ』 event (2026-08-20 ~ the end of 33): 理々奈 and 彩葉 every day, the third drawn //
  chara.push(19, 20);
  while (chara.length < 3) {
    const c = Math.floor(random() * CHARAS);
    if (!chara.includes(c)) chara.push(c);
  }
  return { appearance_id, music, chara };
}

async function load(refid: string, version: number): Promise<tsujigiri> {
  const saved = await DB.FindOne<tsujigiri>(refid, { collection: "tsujigiri", version });
  return {
    collection: "tsujigiri", version, total_num_sp: 0, total_num_dp: 0, appearance_id: 0, defeat_flg: 0,
    ...(saved ?? {}), defeat: saved?.defeat ?? empty(), encount: saved?.encount ?? empty(),
  };
}

/** pc.get: the totals, the day's table and what the player beat. */
export async function Tsujigiri(refid: string, version: number) {
  const t = await load(refid, version), table = await TodayTable(version);
  return {
    total_num_sp: t.total_num_sp,
    total_num_dp: t.total_num_dp,
    table,
    defeat_flg: t.appearance_id == table.appearance_id ? t.defeat_flg : 0,
    total_defeat: t.defeat.map((num, id) => ({ id, num })).filter((c) => c.num > 0),
  };
}

/** pc.save: the totals and the characters met and beaten. */
export async function SaveTsujigiri(refid: string, version: number, data) {
  const total = $(data).element("tsujigiri"), hidden = $(data).element("tsujigiri_hidden_chara");
  const arena = $(data).element("arena_data")?.element("tsujigiri_hidden_chara");
  if (_.isNil(total) && _.isNil(hidden) && _.isNil(arena)) return;

  const t = await load(refid, version), now = Math.floor(Date.now() / 1000);
  const valid = (id: number) => Number.isInteger(id) && id >= 0 && id < CHARAS;
  if (!_.isNil(total)) { // totals, not differences
    t.total_num_sp = Number(total.attr().total_num_sp) || 0;
    t.total_num_dp = Number(total.attr().total_num_dp) || 0;
  }
  const beaten = new Set<number>();
  if (!_.isNil(hidden)) {
    const id = Number(hidden.attr().appearance_id);
    if (id == JstDate()) { // a credit from the day before keeps nothing of its day
      t.defeat_flg = ((t.appearance_id == id ? t.defeat_flg : 0) | Number(hidden.attr().defeat_flg)) & 7;
      t.appearance_id = id;
    }
    for (const d of hidden.elements("defeat")) {
      const c = Number(d.attr().chara_id);
      if (!valid(c)) continue;
      t.defeat[c] = Math.max(t.defeat[c], Number(d.attr().num) || 0); // the character's total
      t.encount[c] = t.encount[c] || now;
      beaten.add(c);
    }
    for (const e of hidden.elements("encount")) {
      const c = Number(e.attr().chara_id);
      if (valid(c)) t.encount[c] = t.encount[c] || now;
    }
  }
  if (!_.isNil(arena) && !_.isNil(arena.element("defeat"))) { // a win in ARENA is not in <defeat>
    const c = Number(arena.attr().chara_id);
    if (valid(c) && !beaten.has(c)) t.defeat[c]++;
    if (valid(c)) t.encount[c] = t.encount[c] || now;
  }
  await DB.Upsert<tsujigiri>(refid, { collection: "tsujigiri", version }, t);
}

/** music.appoint: the rivals of normal tsujigiri and the hidden character's score, as asked. */
export async function TsujigiriAppoint(refid: string, version: number, mid: number, clid: number, data) {
  const result: any = {};
  const mine = _.isNil(refid) ? null : await DB.FindOne<score>(refid, { collection: "score", mid, [clid]: { $exists: true } });
  const best = mine?.esArray?.[clid] ?? 0;
  const everyone = (await DB.Find<score>(null, { collection: "score", mid, [clid]: { $exists: true } }))
    .filter((s) => (s.esArray?.[clid] ?? 0) > 0)
    .sort((a, b) => b.esArray[clid] - a.esArray[clid])
    .slice(0, 1000);

  if ($(data).bool("is_tsujigiri") && everyone.length > 0) {
    const qpro = await ReftoQPRO(everyone[0].__refid, version);
    const ranking = [];
    for (let n = 0; n < everyone.length; n++)
      ranking.push(K.ATTR({ ranking_num: String(n), djname: String((await ReftoProfile(everyone[n].__refid))[0] ?? ""), ex_score: String(everyone[n].esArray[clid]) }));
    result.tsujigiri_data = {
      pre_my_data: K.ATTR({ ex_score: String(best) }),
      top_qpro: K.ATTR({ head: String(qpro[1] ?? 0), hair: String(qpro[0] ?? 0), face: String(qpro[2] ?? 0), body: String(qpro[3] ?? 0), hand: String(qpro[4] ?? 0), back: String(qpro[5] ?? 0) }),
      ranking,
    };
  }

  if ($(data).bool("is_tsujigiri_hidden_chara")) {
    // the same score all day for the chart: no retrying for a weaker one
    const random = Random(JstDate() ^ Math.imul(mid, 131) ^ Math.imul(clid + 1, 7919) ^ Hash(refid ?? ""));
    const top = everyone[0]?.esArray[clid] ?? 0;
    const level = (await MusicList(version))?.find(([id]) => id == mid)?.[3][clid] ?? 8;
    const score = best > 0 ? best * (0.85 + random() * 0.15) : top > 0 ? top * (0.65 + random() * 0.2) : 100 * Math.max(1, level);
    result.tsujigiri_hidden_chara_data = { "@attr": { score: String(Math.round(score)) }, enable_score: K.ITEM("bool", true) };
  }
  return result;
}
