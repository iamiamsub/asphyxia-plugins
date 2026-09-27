import { difficulty_override } from "../models/difficulty";
import { MusicList } from "./musiclist";

// Difficulty tables, taken once and shipped with the plugin (data/difficulty.json, made by the
// difficulty-tables tool from the players' tables, credited in the README): the SP☆12 reference
// tables and the SP☆11 tables (2025-02) for normal and hard clears (rank 1 F .. 10 S+) and the DP
// unofficial difficulty table (5.9 .. 12.7), keyed by music id and chart (style * 5 + difficulty,
// as music.reg's clid).
// The Difficulty Tables page changes ranks over the snapshot (difficulty_override); bingo uses the
// result.

type Rank = { value: number; label: string };
export interface DifficultyTables {
  sp12_normal: Map<string, Rank>;
  sp12_hard: Map<string, Rank>;
  sp11_normal: Map<string, Rank>;
  sp11_hard: Map<string, Rank>;
  dp_normal: Map<string, Rank>;
}
const TABLES = ["sp12_normal", "sp12_hard", "sp11_normal", "sp11_hard", "dp_normal"];
const empty = (): DifficultyTables => ({ sp12_normal: new Map(), sp12_hard: new Map(), sp11_normal: new Map(), sp11_hard: new Map(), dp_normal: new Map() });
export const SP12_RANKS = ["F", "E", "D", "C", "B", "B+", "A", "A+", "S", "S+"]; // value 1..10

const key = (mid: number, chart: number) => `${mid}:${chart}`;
let snapshot: { generated: string; sources: Record<string, any>; tables: DifficultyTables } | null = null;
let tables: DifficultyTables | null = null;

async function Snapshot() {
  if (snapshot) return snapshot;
  snapshot = { generated: "", sources: {}, tables: empty() };
  if (IO.Exists("data/difficulty.json")) {
    const data = JSON.parse(await IO.ReadFile("data/difficulty.json", "utf-8"));
    snapshot.generated = data.generated ?? "";
    for (const name of TABLES) {
      const { entries, ...source } = data.tables?.[name] ?? { entries: [] };
      snapshot.sources[name] = source;
      for (const [mid, chart, value, label] of entries ?? []) snapshot.tables[name].set(key(mid, chart), { value, label });
    }
  }
  return snapshot;
}

/** The ranks in use: the snapshot with the page's changes. */
export async function Difficulty(): Promise<DifficultyTables> {
  if (tables) return tables;
  const base = (await Snapshot()).tables;
  const merged = empty();
  for (const name of TABLES) for (const [k, v] of base[name]) merged[name].set(k, v);
  for (const o of await DB.Find<difficulty_override>({ collection: "difficulty_override" })) {
    if (!merged[o.table]) continue;
    if (o.value === null) merged[o.table].delete(key(o.mid, o.chart));
    else merged[o.table].set(key(o.mid, o.chart), { value: o.value, label: o.label });
  }
  return (tables = merged);
}

/**
 * How hard a lamp on a chart is, on one scale with the levels: the level itself, but SP☆11 / ☆12 by
 * the table's rank for that lamp (☆11 F 10.6 .. S+ 11.5, without a rank 11; ☆12 F 11.6 .. S+ 12.5,
 * null without a rank: the ☆12 range is too wide to guess) and DP HYPER .. LEGGENDARIA by the
 * unofficial table (it rates normal clears; hard ones use it too).
 */
export function ChartDifficulty(t: DifficultyTables, mid: number, chart: number, level: number, lamp: number): number | null {
  const k = key(mid, chart);
  if (chart >= 5) return t.dp_normal.get(k)?.value ?? level;
  if (level < 11) return level;
  const hard = lamp >= 5;
  const rank = (level == 11 ? (hard ? t.sp11_hard : t.sp11_normal) : hard ? t.sp12_hard : t.sp12_normal).get(k);
  if (level == 11) return rank ? 10.5 + rank.value / 10 : 11;
  return rank ? 11.5 + rank.value / 10 : null;
}

/**
 * WebUI: a table's charts, with the snapshot's and the current rank: { table, level } (level for DP;
 * the SP tables list the SP level 11 / 12 HYPER .. LEGGENDARIA charts).
 */
export const getDifficulty = async (data: { table?: string; level?: number }, send: WebUISend) => {
  const table = String(data.table);
  if (!TABLES.includes(table)) return send.error(400, "unknown table");
  const snap = await Snapshot(), now = await Difficulty(), list = (await MusicList(33)) ?? [];
  const level = table == "dp_normal" ? Number(data.level) || 12 : table.startsWith("sp11") ? 11 : 12, charts = table == "dp_normal" ? [7, 8, 9] : [2, 3, 4];
  const rows = [];
  for (const [mid, , title, levels] of list)
    for (const chart of charts)
      if (levels[chart] == level) {
        const k = key(mid, chart);
        rows.push({ mid, chart, title, level, snapshot: snap.tables[table].get(k)?.label ?? null, current: now[table].get(k)?.label ?? null });
      }
  send.json({ table, generated: snap.generated, source: snap.sources[table] ?? null, songs: list.length, rows });
};

/** WebUI: a chart's rank: { table, mid, chart, label } (label null: no rank; reset: back to the snapshot). */
export const setDifficulty = async (data: { table?: string; mid?: number; chart?: number; label?: string | null; reset?: boolean }, send: WebUISend) => {
  const table = String(data.table), mid = Number(data.mid), chart = Number(data.chart);
  if (!TABLES.includes(table) || !Number.isInteger(mid) || !Number.isInteger(chart) || chart < 0 || chart > 9) return send.error(400, "bad chart");
  const query = { collection: "difficulty_override" as const, table, mid, chart };
  if (data.reset) {
    await DB.Remove<difficulty_override>(query);
  } else {
    let value: number | null = null, label: string | null = null;
    if (data.label !== null && data.label !== undefined && data.label !== "") {
      if (table == "dp_normal") {
        value = Math.round(Number(data.label) * 10) / 10;
        if (!(value >= 1 && value <= 13)) return send.error(400, "bad number");
        label = value.toFixed(1);
      } else {
        const m = /^(地力|個人差)(F|E|D|C|B\+?|A\+?|S\+?)$/.exec(String(data.label));
        if (!m) return send.error(400, "bad rank");
        value = SP12_RANKS.indexOf(m[2]) + 1;
        label = m[0];
      }
    }
    await DB.Upsert<difficulty_override>(query, { ...query, value, label });
  }
  tables = null; // taken again with the change
  send.json({ current: (await Difficulty())[table].get(key(mid, chart))?.label ?? null });
};
