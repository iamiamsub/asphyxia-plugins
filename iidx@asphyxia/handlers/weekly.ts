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
// The rating per style and N/H/A (<weekly_rating_sp|dp>, and rating_before / rating_after = if the
// week closed now on the panels) follows only the places: the official formula is not known, so
// this one does what the players see (BEMANIwiki): the points are close in the middle and spread
// toward both ends, the top more, a week not played changes nothing, and few weeks rate low.

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

/**
 * A week's points for a place of n: the log-odds of the place (the middle 0) spread 1500 a unit up
 * and 1000 down from 7000, within 3000 .. 13000 (1st of 3 9414, 1st of 10 11417, alone 7000).
 */
export function WeekPoints(place: number, n: number) {
  const q = (place - 0.5) / n, z = Math.max(-4, Math.min(4, Math.log((1 - q) / q)));
  return 7000 + z * (z > 0 ? 1500 : 1000);
}

/** The rating of a chart (clid) over the weeks up to `upto` played: the last 10 weeks' points / 10. */
function Rating(all: weekly_score[], refid: string, clid: number, upto: number) {
  const weeks = all.filter((r) => r.__refid == refid && r.clid == clid && r.wid <= upto).map((r) => r.wid).sort((a, b) => a - b).slice(-10);
  if (weeks.length == 0) return null;
  let sum = 0;
  for (const w of weeks) {
    const s = Standings(all.filter((r) => r.wid == w && r.clid == clid));
    sum += WeekPoints(s.sorted.findIndex((r) => r.__refid == refid) + 1, s.n);
  }
  return Math.round(sum / 10);
}

/** A weekly_score for a chart this week: the rank shown is the top one of a tie; the rating now and after this week. */
function ScoreNode(clid: number, all: weekly_score[], wid: number, refid: string) {
  const s = Standings(all.filter((r) => r.wid == wid && r.clid == clid)), mine = s.sorted.find((r) => r.__refid == refid);
  const rank = mine ? 1 + s.sorted.filter((r) => r.score > mine.score).length : 0;
  const attr: Record<string, string> = { class_id: String(clid) };
  s.border_score.forEach((v, j) => (attr[`border_score_${j}`] = String(v)));
  s.border_rank.forEach((v, j) => (attr[`border_rank_${j}`] = String(v)));
  const before = Rating(all, refid, clid, wid - 1), after = mine ? Rating(all, refid, clid, wid) : null;
  if (before !== null) attr.rating_before = String(before);
  if (after !== null) attr.rating_after = String(after);
  return { ...attr, rank: String(rank), score: String(mine?.score ?? 0), total_user: String(s.n) };
}

/** pc.get: the week's song, this week's panels, the stars so far and the last week's result. */
export async function Weekly(refid: string, version: number, data: pcdata) {
  const wid = WeeklyId();
  const all = await DB.Find<weekly_score>(null, { collection: "weekly_score", version });
  const on = !!U.GetConfig("ss_weekly_ranking"); // off: no song of the week (icons, RECOMMEND, panel) and no last week's result
  const mid = on ? await WeeklyMusic(version, wid, all) : -1;
  const of = (w: number, clid: number) => all.filter((r) => r.wid == w && r.clid == clid);

  const achieve = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  const mine = all.filter((r) => r.__refid == refid && r.wid < wid);
  for (const r of mine) {
    const s = Standings(of(r.wid, r.clid)), star = s.star(s.sorted.findIndex((x) => x.__refid == refid) + 1);
    if (star > 0) achieve[r.clid < 5 ? 0 : 1][star - 1]++;
  }

  let result = null;
  const last = Math.max(0, ...mine.map((r) => r.wid));
  if (on && last > 0 && last > (data.weekly_checked ?? 0)) {
    const rows = mine.filter((r) => r.wid == last);
    result = {
      week_id: last, music_id: rows[0].mid,
      detail: rows.map((r) => {
        const s = Standings(of(last, r.clid)), rank = s.sorted.findIndex((x) => x.__refid == refid) + 1;
        return { class_id: r.clid, rank_num: rank, participation: s.n, achieve: s.star(rank) };
      }),
    };
  }

  // weekly_rating_1..3 = N, H, A of the closed weeks; a chart never played has none ("-")
  const rating = [[1, 2, 3], [6, 7, 8]].map((clids) => clids.reduce((o, clid, i) => {
    const r = Rating(all, refid, clid, wid - 1);
    return r === null ? o : { ...o, [`weekly_rating_${i + 1}`]: r };
  }, {}));

  return {
    wid, mid,
    scores: mid > 0 ? CLASSES.map((clid) => ScoreNode(clid, all, wid, refid)) : [],
    achieve: achieve.map((a) => a.reduce((o, v, j) => ({ ...o, [`weekly_achieve_${j}`]: v }), {})),
    rating,
    result,
  };
}

/** music.reg: a full play of the week's song counts; the played chart's panel back. */
export async function WeeklyReg(refid: string, version: number, mid: number, clid: number, exscore: number, data) {
  const wid = WeeklyId();
  if (Number($(data).attr().wid) != wid || !CLASSES.includes(clid) || _.isNil(refid) || !U.GetConfig("ss_weekly_ranking")) return null;
  const week = await DB.Find<weekly_score>(null, { collection: "weekly_score", version, wid });
  if ((await WeeklyMusic(version, wid, week)) != mid) return null;

  const query = { collection: "weekly_score" as const, version, wid, clid };
  const mine = week.find((r) => r.__refid == refid && r.clid == clid);
  if (Number($(data).attr().is_death) == 0 && exscore > (mine?.score ?? 0)) {
    await DB.Upsert<weekly_row>(refid, query, { ...query, mid, score: exscore, time: Math.floor(Date.now() / 1000) });
  }
  const all = await DB.Find<weekly_score>(null, { collection: "weekly_score", version, clid });
  return { "@attr": ScoreNode(clid, all, wid, refid), aggregating_rating: K.ITEM("bool", false) }; // class_id must be the played clid
}

/** pc.save: the last week's result was seen. */
export function SaveWeekly(data: pcdata, request) {
  const r = $(request).element("weekly_result");
  if (!_.isNil(r)) data.weekly_checked = Math.max(data.weekly_checked ?? 0, Number(r.attr().check_week_id) || 0);
}
