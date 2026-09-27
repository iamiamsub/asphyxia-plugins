import { pcdata } from "../models/pcdata";
import { weekly_score as weekly_row } from "../models/weekly";

type weekly_score = weekly_row & { __refid?: string };
import { Random } from "../util";
import { MusicPool, PlayableSongs } from "./musiclist";

// WEEKLY RANKING (IIDX 33, bm2dx 2026081900). pc.get <weekly wid@ mid@> is the week's song (icon,
// folders, RECOMMEND, N/H/A unlocked that week, music.reg sends wid@); <weekly_score> per chart
// (class_id = chart number, N/H/A: 1..3, 6..8) is the ranking panel: rank (0 = not in), score,
// total_user, border_rank_j = the lowest place that gets star j (0 white .. 4 platinum) and
// border_score_j its score; music.reg answers the played chart's. The client neither counts stars
// nor knows the time: the server closes the weeks. <weekly_achieve_sp|dp> are the stars got so far
// (the client makes the badges from them) and <weekly_result> the last week's places, shown once at
// card in and acknowledged in pc.save (weekly_result check_week_id). Weeks run from Wednesday 12:00
// JST; week 1 began 2025-10-08. Only full plays of N/H/A count, the best EX per chart; the same
// score goes to who reached it first. The stars scale with the players, so a few still get colors.

const START = Date.UTC(2025, 9, 8, 3); // 2025-10-08 12:00 JST
const WEEK = 7 * 86400 * 1000;
const CLASSES = [1, 2, 3, 6, 7, 8];

/** The week's number (1 = 2025-10-08). */
export const WeeklyId = (time = Date.now()) => Math.floor((time - START) / WEEK) + 1;

/** The song of the week: the one already played that week, else drawn with the week as the seed. */
async function WeeklyMusic(version: number, wid: number, rows: weekly_score[]) {
  const played = rows.find((r) => r.wid == wid);
  if (played) return played.mid;
  const full = (await PlayableSongs(version)).filter(([, , , levels]) => CLASSES.every((c) => levels[c] > 0)).map(([id]) => id);
  const pool = full.length ? full : await MusicPool(version);
  return pool.length ? pool[Math.floor(Random(wid ^ 0x7765656b)() * pool.length)] : -1;
}

/** The chart's standings: rows by score, the earlier first on ties, and the star borders. */
function Standings(rows: weekly_score[]) {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.time - b.time);
  const n = sorted.length;
  const border_rank = n ? [Math.ceil(n * 0.75), Math.ceil(n * 0.5), Math.ceil(n * 0.25), Math.ceil(n * 0.1), Math.min(10, Math.ceil(n * 0.05))] : [0, 0, 0, 0, 0];
  const border_score = border_rank.map((r) => (r > 0 ? sorted[r - 1].score : 0));
  const star = (rank: number) => (rank > 0 ? border_rank.reduce((a, r, j) => (r > 0 && rank <= r ? j + 1 : a), 0) : 0); // 1 white .. 5 platinum
  return { sorted, n, border_rank, border_score, star };
}

/** A weekly_score for a chart this week: the rank shown is the top one of a tie. */
function ScoreNode(clid: number, rows: weekly_score[], refid: string) {
  const s = Standings(rows), mine = s.sorted.find((r) => r.__refid == refid);
  const rank = mine ? 1 + s.sorted.filter((r) => r.score > mine.score).length : 0;
  const attr: Record<string, string> = { class_id: String(clid) };
  s.border_score.forEach((v, j) => (attr[`border_score_${j}`] = String(v)));
  s.border_rank.forEach((v, j) => (attr[`border_rank_${j}`] = String(v)));
  return { ...attr, rank: String(rank), score: String(mine?.score ?? 0), total_user: String(s.n) };
}

/** pc.get: the week's song, this week's panels, the stars so far and the last week's result. */
export async function Weekly(refid: string, version: number, data: pcdata) {
  const wid = WeeklyId();
  const all = await DB.Find<weekly_score>(null, { collection: "weekly_score", version });
  const mid = await WeeklyMusic(version, wid, all);
  const of = (w: number, clid: number) => all.filter((r) => r.wid == w && r.clid == clid);

  const achieve = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  const mine = all.filter((r) => r.__refid == refid && r.wid < wid);
  for (const r of mine) {
    const s = Standings(of(r.wid, r.clid)), star = s.star(s.sorted.findIndex((x) => x.__refid == refid) + 1);
    if (star > 0) achieve[r.clid < 5 ? 0 : 1][star - 1]++;
  }

  let result = null;
  const last = Math.max(0, ...mine.map((r) => r.wid));
  if (last > 0 && last > (data.weekly_checked ?? 0)) {
    const rows = mine.filter((r) => r.wid == last);
    result = {
      week_id: last, music_id: rows[0].mid,
      detail: rows.map((r) => {
        const s = Standings(of(last, r.clid)), rank = s.sorted.findIndex((x) => x.__refid == refid) + 1;
        return { class_id: r.clid, rank_num: rank, participation: s.n, achieve: s.star(rank) };
      }),
    };
  }

  return {
    wid, mid,
    scores: mid > 0 ? CLASSES.map((clid) => ScoreNode(clid, of(wid, clid), refid)) : [],
    achieve: achieve.map((a) => a.reduce((o, v, j) => ({ ...o, [`weekly_achieve_${j}`]: v }), {})),
    result,
  };
}

/** music.reg: a full play of the week's song counts; the played chart's panel back. */
export async function WeeklyReg(refid: string, version: number, mid: number, clid: number, exscore: number, data) {
  const wid = WeeklyId();
  if (Number($(data).attr().wid) != wid || !CLASSES.includes(clid) || _.isNil(refid)) return null;
  const week = await DB.Find<weekly_score>(null, { collection: "weekly_score", version, wid });
  if ((await WeeklyMusic(version, wid, week)) != mid) return null;

  const query = { collection: "weekly_score" as const, version, wid, clid };
  const mine = week.find((r) => r.__refid == refid && r.clid == clid);
  if (Number($(data).attr().is_death) == 0 && exscore > (mine?.score ?? 0)) {
    await DB.Upsert<weekly_row>(refid, query, { ...query, mid, score: exscore, time: Math.floor(Date.now() / 1000) });
  }
  const rows = await DB.Find<weekly_score>(null, query);
  return { "@attr": ScoreNode(clid, rows, refid), aggregating_rating: K.ITEM("bool", false) }; // class_id must be the played clid
}

/** pc.save: the last week's result was seen. */
export function SaveWeekly(data: pcdata, request) {
  const r = $(request).element("weekly_result");
  if (!_.isNil(r)) data.weekly_checked = Math.max(data.weekly_checked ?? 0, Number(r.attr().check_week_id) || 0);
}
