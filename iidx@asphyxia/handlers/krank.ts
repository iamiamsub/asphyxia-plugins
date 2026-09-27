import { krank, krank_music } from "../models/krank";
import { JstDate } from "../util";

// KAIDEN RANK (皆伝ランク, IIDX 33, bm2dx 2026081900). Only for a style whose DJ TRAINING tier is 6
// (BLACK) and whose dan is 皆伝: pc.get <krank> gives the season and, per style, 7 songs (klevel ★1..7)
// with the player's lamp and tries; the client works out the skill, the rank and the K badge, and
// music.reg (krank_season/midx/pnum/element@) asks for the new record, which the server answers in
// <krank> (every time: the client reloads from it) with <element/> when it hands a K-ELEMENT (one
// for any song and one for every song, each once a season, 12 in all). pc.save <krank_data> gives
// the K-ELEMENTs used for the LEGGENDARIAs.
// The client has no rule for the seasons or the songs: seasons are 14 days from 2025-12-01 00:00 JST
// as the arcade's, the songs the arcade's seasons 1..21 (data/krank.json, from BEMANIwiki by the
// krank-songs tool) played over again from the first once they are done, and the tries of the day
// start over at midnight JST (premium). The DJ TRAINING tier comes from its progress (djtraining.ts): PURPLE's last
// Part cleared makes BLACK, and the client opens the folder when the dan is 皆伝 too.

const START = 1764514800; // 2025-12-01 00:00 JST
const SEASON = 14 * 86400;

export const SeasonId = (time = Date.now() / 1000) => Math.floor((time - START) / SEASON) + 1;

const COUNT = [1000, 1000, 990, 980, 950, 930, 910, 880, 840, 800, 750]; // by tries, 10 and more alike
const LAMP = [0, 0, 1, 5, 7, 20, 40, 40];
const KLEVEL = [0, 1, 2, 3, 5, 8, 15, 26];

/** A song's skill as the client counts it (CKaidenRankGameData::CalcMusicSkill). */
export function MusicSkill(clear_type: number, tries: number, klevel: number) {
  if (!(clear_type >= 0 && clear_type <= 7 && klevel >= 1 && klevel <= 7)) return 0;
  return Math.floor((COUNT[Math.min(10, Math.max(1, tries))] * LAMP[clear_type] * KLEVEL[klevel] + 500) / 1000);
}

const skill = (music: krank_music[]) => music.reduce((s, m) => s + MusicSkill(m.clear_type, m.best, m.klevel), 0);

let seasons: { sp: number[][]; dp: number[][] }[] | null = null; // data/krank.json: [★, music id, clid] x 7 per style

/** The season's songs of a style: the arcade's seasons (BEMANIwiki, 1..21) over again from the first, by ★. */
async function SeasonMusic(season_id: number, style: number): Promise<krank_music[]> {
  if (seasons === null) seasons = IO.Exists("data/krank.json") ? JSON.parse(await IO.ReadFile("data/krank.json", "utf-8")).seasons : [];
  if (!seasons.length) return [];
  return seasons[(season_id - 1) % seasons.length][style ? "dp" : "sp"]
    .map(([klevel, mid, clid]) => ({ klevel, mid, clid, clear_type: 0, best: 0, now: 0, total: 0 }))
    .sort((a, b) => a.klevel - b.klevel);
}

async function load(refid: string, version: number): Promise<krank> {
  const saved = await DB.FindOne<krank>(refid, { collection: "krank", version });
  return {
    collection: "krank", version, season_id: 0, music: [[], []], prev_skill: [0, 0],
    element_get: 0, element_use: 0, element_append_get: 0, element_append_use: 0, element_season: 0, append_season: 0, reset_day: 0,
    ...(saved ?? {}),
  };
}

const store = (refid: string, k: krank) => {
  const { _id, __refid, __s, createdAt, updatedAt, ...doc } = k as any; // the database's own fields stay its own
  return DB.Upsert<krank>(refid, { collection: "krank", version: k.version }, doc);
};

/** pc.get: the season (turned over when due), the tries of the day and the tiers. */
export async function Krank(refid: string, version: number) {
  const k = await load(refid, version), season_id = SeasonId(), today = JstDate();
  for (const style of [0, 1]) {
    if (k.season_id != season_id) {
      k.prev_skill[style] += skill(k.music[style] ?? []);
      k.music[style] = [];
    }
    // the season's songs (a list made by another rule is replaced, records and all)
    const songs = await SeasonMusic(season_id, style), now = k.music[style] ?? [];
    if (now.length != songs.length || songs.some((s, i) => now[i].mid != s.mid || now[i].clid != s.clid)) k.music[style] = songs;
  }
  k.season_id = season_id;
  if (k.reset_day != today) {
    k.music.forEach((list) => list.forEach((m) => (m.now = 0)));
    k.reset_day = today;
  }
  await store(refid, k);

  const got = k.element_get + k.element_append_get;
  return {
    season_id, end_time: START + season_id * SEASON - 60,
    element_get: k.element_get, element_use: k.element_use, element_append_get: k.element_append_get, element_append_use: k.element_append_use,
    enable_element_get: k.element_season != season_id && got < 12 ? 1 : 0,
    enable_element_append_get: k.append_season != season_id && got < 12 ? 1 : 0,
    styles: [0, 1].map((style) => ({
      prev_season_skill: k.prev_skill[style], now_season_skill: skill(k.music[style]),
      music: k.music[style].map((m, index) => ({
        index, klevel: m.klevel, music_id: m.mid, class_id: m.clid, clear_type: m.clear_type,
        play_num_best: m.best, play_num_now: m.now, play_num_total: m.total,
      })),
    })),
  };
}

/** music.reg: the played song's new record and the K-ELEMENTs, when the client asks (krank_season@). */
export async function KrankReg(refid: string, version: number, mid: number, clid: number, lamp: number, data) {
  const a = $(data).attr();
  if (_.isNil(a.krank_season) || _.isNil(refid)) return null;
  const k = await load(refid, version), style = clid < 5 ? 0 : 1, index = Number(a.krank_midx);
  const m = k.music[style]?.[index];
  if (k.season_id != Number(a.krank_season) || !m || m.mid != mid || m.clid != clid) return null;

  const tries = Math.max(1, Number(a.krank_pnum) || 1), old = MusicSkill(m.clear_type, m.now, m.klevel);
  m.total += tries;
  m.now += tries;
  if (MusicSkill(lamp, m.now, m.klevel) > old) {
    m.best = m.now;
    m.clear_type = lamp;
  }
  const node: any = K.ATTR({
    play_style: String(style), index: String(index), clear_type: String(m.clear_type),
    play_num_best: String(m.best), play_num_now: String(m.now), play_num_total: String(m.total),
  });
  if (Number(a.krank_element) == 1 && k.element_season != k.season_id && k.element_get + k.element_append_get < 12) {
    k.element_get++;
    k.element_season = k.season_id;
    node.element = K.ATTR({});
  }
  if (Number(a.krank_element_append) == 1 && k.append_season != k.season_id && k.element_get + k.element_append_get < 12) {
    k.element_append_get++;
    k.append_season = k.season_id;
    node.element_append = K.ATTR({});
  }
  await store(refid, k);
  return node;
}

/** pc.save: the K-ELEMENTs used. */
export async function SaveKrank(refid: string, version: number, data) {
  const used = $(data).element("krank_data");
  if (_.isNil(used)) return;
  const k = await load(refid, version);
  if (!_.isNil(used.attr().element)) k.element_use = Number(used.attr().element) || 0;
  if (!_.isNil(used.attr().element_append)) k.element_append_use = Number(used.attr().element_append) || 0;
  await store(refid, k);
}
