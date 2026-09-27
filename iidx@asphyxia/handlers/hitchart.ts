import { hitchart_play } from "../models/hitchart";
import { GetVersion } from "../util";

// Hit chart on the LIGHTNING MODEL sub screen (pc.common <hitchart>, IIDX 33).
//
// The game reads <hitchart kind@ period@> with up to 30 <ranking music_id@ rank@(s64)>:
// kind 0 = national, 1 = shop; period 0 = all time, 1 = month, 2 = week (the order of the
// sub screen's sort buttons). rank@ is the song's play count: the game sorts by it, most
// played first, ties by music id (bm2dx Xrpc_PcCommon_Parse, std_sort_HitchartEntry).
//
// Built from the plays this server recorded: music.reg, and music.play (no card) and music.nosave
// (DP BATTLE, beginner assist, songs that are not saved), which carry the same <music_play_log>.
// Each version counts its own plays. A private server is one shop, so "national" and "shop" get
// the same list.

const PERIODS = [0, 30 * 86400, 7 * 86400]; // seconds back from now; 0 = all time
const FIRST_VERSION = 33; // the first with a hit chart

export async function RecordHitChartPlay(version: number, mid: number) {
  if (version < FIRST_VERSION || !(mid > 0) || !U.GetConfig("HitChart")) return;
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
    const counts = new Map<number, number>();
    for (const p of plays) {
      if (PERIODS[period] === 0 || p.time >= now - PERIODS[period]) {
        counts.set(p.mid, (counts.get(p.mid) || 0) + 1);
      }
    }
    // Array.from, not [...]: cores that compile plugins to ES5 spread a Map's entries into nothing
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 30);
    for (const kind of [0, 1]) {
      result.push({
        "@attr": { kind: String(kind), period: String(period) },
        ranking: top.map(([mid, count]) => K.ATTR({ music_id: String(mid), rank: String(count) })),
      });
    }
  }
  return result;
}
