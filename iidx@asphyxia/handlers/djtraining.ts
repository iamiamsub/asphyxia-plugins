import { djtraining, djtraining_progress } from "../models/djtraining";
import { pcdata } from "../models/pcdata";

// DJ TRAINING (IIDX 33, bm2dx 2026081900). Folders of 10 charts by color (tier 0 WHITE .. 5 PURPLE,
// 6 BLACK = KAIDEN RANK) and Part, SP and DP apart (data/djtraining.json). The client only raises the
// lower lamp of a chart played from a folder (music.reg djt_tier/part/midx@ when it went up) and
// sums the folder's points (COMPLETE at 50); which folders show is the server's: pc.get and the
// music.reg answer send per style tier@, step@ (the Parts of the color passed) and up to 5 folders
// (index 0..4, one color, the Parts from step + 1 up), and the client rebuilds the folders from the
// answer. The rules follow BEMANIwiki: 50 points clears a Part and the Parts under it, the color's
// last Part moves to the next color, PURPLE's last to BLACK; the first color comes from the dan
// (the official rule is not known) and a dan passed later lifts it, never lowers it.
// See asphyxia-v33-review/spec-dj-training.md.

const POINTS = [0, 1, 2, 5, 10, 15, 25, 50]; // by lamp: NO PLAY, FAILED, ASSIST, EASY, CLEAR, HARD, EX HARD, FC
const LAST_PART = [[5, 9, 9, 10, 10, 10], [3, 9, 9, 10, 10, 10]]; // [style][tier]
const BLACK = 6;

type Chart = { mid: number[]; diff: number[] };
let charts: Record<string, Record<string, Record<string, Chart>>> | null = null; // style -> tier -> part

async function Charts(version: number) {
  if (charts === null) charts = JSON.parse(await IO.ReadFile("data/djtraining.json", "utf-8"))[version] ?? {};
  return charts;
}

/**
 * The color a dan starts at: none .. 5th kyu WHITE, 4th .. 1st kyu GREEN, 1st .. 3rd dan BLUE, 4th .. 7th
 * YELLOW, 8th RED, 9th and up PURPLE (a DP 9th dan was seen starting at PURPLE-0 on the arcade).
 */
export function DanTier(dan: number) {
  return dan < 3 ? 0 : dan < 7 ? 1 : dan < 10 ? 2 : dan < 14 ? 3 : dan < 15 ? 4 : 5;
}

/** Moves a style on over the Parts showing that have 50 points (points(tier, part)), the next color after the last. */
export function Advance(style: number, p: { tier: number; step: number }, points: (tier: number, part: number) => number) {
  for (;;) {
    if (p.tier >= BLACK) return p;
    const last = LAST_PART[style][p.tier];
    let cleared = 0;
    for (let part = p.step + 1; part <= Math.min(p.step + 5, last); part++) if (points(p.tier, part) >= 50) cleared = part;
    if (cleared == 0) return p;
    if (cleared == last) Object.assign(p, { tier: p.tier + 1, step: 0 });
    else p.step = cleared;
  }
}

/** Both styles' progress, lifted by the dans and moved on over the saved lamps (saved when it changed), and the folders to send. */
export async function DjTraining(refid: string, version: number, dans: number[]) {
  const data = await Charts(version);
  const lamps = await DB.Find<djtraining>(refid, { collection: "djtraining", version });
  const saved = await DB.FindOne<djtraining_progress>(refid, { collection: "djtraining_progress", version });
  const tier = [...(saved?.tier ?? [-1, -1])], step = [...(saved?.step ?? [0, 0])];

  const lamp = (style: number, t: number, part: number, i: number) =>
    lamps.find((l) => l.play_style == style && l.tier == t && l.part == part && l.midx == i)?.cflg ?? 0;
  const styles = [0, 1].map((style) => {
    const p = { tier: tier[style], step: step[style] };
    const start = DanTier(dans[style] ?? -1);
    if (p.tier < BLACK && start > p.tier) Object.assign(p, { tier: start, step: 0 }); // first time, or a dan passed since
    Advance(style, p, (t, part) => (data[style]?.[t]?.[part]?.mid ?? []).reduce((sum, _m, i) => sum + POINTS[lamp(style, t, part, i)], 0));

    const folders = [];
    if (p.tier < BLACK)
      for (let part = p.step + 1; part <= Math.min(p.step + 5, LAST_PART[style][p.tier]); part++) {
        const c = data[style]?.[p.tier]?.[part];
        if (!c) break; // no gaps: the client counts the Part number from the position
        folders.push({
          index: folders.length, tier: p.tier, part,
          music: c.mid.slice(0, 10).map((music_id, index) => ({ index, music_id, class_id: c.diff[index], clear_type: lamp(style, p.tier, part, index) })),
        });
      }
    return { tier: p.tier, step: p.step, folders };
  });

  if (styles.some((s, i) => s.tier != tier[i] || s.step != step[i])) {
    const query = { collection: "djtraining_progress" as const, version };
    await DB.Upsert<djtraining_progress>(refid, query, { ...query, tier: styles.map((s) => s.tier), step: styles.map((s) => s.step) });
  }
  return styles;
}

/**
 * music.reg with djt_tier/part/midx@ (a lower lamp went up): keeps the lamp and answers the style's
 * progress and folders, lamps and all (the client rebuilds from them), every time.
 */
export async function DjTrainingReg(refid: string, version: number, mid: number, clid: number, cflg: number, data) {
  const a = $(data).attr();
  if (_.isNil(a.djt_tier) || _.isNil(refid)) return null;
  const style = clid < 5 ? 0 : 1, tier = Number(a.djt_tier), part = Number(a.djt_part), midx = Number(a.djt_midx);
  const c = (await Charts(version))[style]?.[tier]?.[part];
  if (!c || c.mid[midx] != mid || c.diff[midx] % 5 != clid % 5) return null; // not a chart of that folder

  const query = { collection: "djtraining" as const, version, play_style: style, tier, part, midx };
  const saved = await DB.FindOne<djtraining>(refid, query);
  await DB.Upsert<djtraining>(refid, query, { $set: { cflg: Math.max(cflg, saved?.cflg ?? 0) } });

  const pc = await DB.FindOne<pcdata>(refid, { collection: "pcdata", version });
  const s = (await DjTraining(refid, version, [pc?.sgid ?? -1, pc?.dgid ?? -1]))[style];
  return {
    "@attr": { play_style: String(style), tier: String(s.tier), step: String(s.step) },
    ...(s.folders.length > 0 ? {
      folder: s.folders.map((f) => ({
        "@attr": { index: String(f.index), tier: String(f.tier), part: String(f.part) },
        music: f.music.map((m) => K.ATTR({ index: String(m.index), music_id: String(m.music_id), class_id: String(m.class_id), clear_type: String(m.clear_type) })),
      })),
    } : {}),
  };
}
