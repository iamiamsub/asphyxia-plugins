import { hitchart_play } from "../models/hitchart";
import { GetVersion } from "../util";

// Hit chart on the LIGHTNING MODEL sub screen (pc.common <hitchart>, IIDX 33).
//
// The game reads <hitchart kind@ period@> with up to 30 <ranking music_id@ rank@(s64)>:
// kind 0 = national, 1 = shop; period 0 = all time, 1 = month, 2 = week (the order of the
// sub screen's sort buttons). rank@ is the song's place: the game lists the songs by it, lowest
// first, and draws rank_num01..10 for places 1..10 (bm2dx Xrpc_PcCommon_Parse,
// CHitChartGameData::BuildHitChartTable, SubHitChart::Draw). Places here go by play count, then
// by the latest play.
//
// Built from the plays this server recorded: music.reg, and music.play (no card) and music.nosave
// (DP BATTLE, beginner assist, songs that are not saved), which carry the same <music_play_log>.
// Each version counts its own plays. A private server is one shop, so "national" and "shop" get
// the same list.

const PERIODS = [0, 30 * 86400, 7 * 86400]; // seconds back from now; 0 = all time
const VERSION = 33; // the version with a hit chart (Sparkle Shower)

export async function RecordHitChartPlay(version: number, mid: number) {
  if (version != VERSION || !(mid > 0) || !U.GetConfig("HitChart")) return;
  await DB.Insert<hitchart_play>({
    collection: "hitchart_play",
    version,
    mid,
    time: Math.floor(Date.now() / 1000),
  });
}

/** music.play / music.nosave: nothing is saved but the play for the hit chart. */
export const musicplaylog: EPR = async (info, data, send) => {
  const log = $(data).element("music_play_log");
  if (log) await RecordHitChartPlay(GetVersion(info), Number(log.attr().music_id));
  return send.success({ format: false, header: false });
};

export async function BuildHitChart(version: number) {
  if (!U.GetConfig("HitChart")) return [];
  const now = Math.floor(Date.now() / 1000);
  // plays kept before they recorded their version count for every version
  const plays = (await DB.Find<hitchart_play>({ collection: "hitchart_play" })).filter((p) => (p.version ?? version) === version);

  const result = [];
  for (let period = 0; period < PERIODS.length; period++) {
    const counts = new Map<number, { count: number; last: number }>();
    for (const p of plays) {
      if (PERIODS[period] === 0 || p.time >= now - PERIODS[period]) {
        const c = counts.get(p.mid) || { count: 0, last: 0 };
        counts.set(p.mid, { count: c.count + 1, last: Math.max(c.last, p.time) });
      }
    }
    // Array.from, not [...]: cores that compile plugins to ES5 spread a Map's entries into nothing
    const top = Array.from(counts.entries())
      .sort(([am, a], [bm, b]) => b.count - a.count || b.last - a.last || am - bm)
      .slice(0, 30);
    for (const kind of [0, 1]) {
      result.push({
        "@attr": { kind: String(kind), period: String(period) },
        ranking: top.map(([mid], i) => K.ATTR({ music_id: String(mid), rank: String(i + 1) })),
      });
    }
  }
  return result;
}
