// Difficulty tables, taken once and shipped with the plugin (data/difficulty.json, made by the
// difficulty-tables tool from the players' tables, credited there): the SP☆12 reference tables for
// normal and hard clears (rank 1 F .. 10 S+) and the DP unofficial difficulty table (5.9 .. 12.7),
// keyed by music id and chart (style * 5 + difficulty, as music.reg's clid).

type Rank = { value: number; label: string };
export interface DifficultyTables {
  sp12_normal: Map<string, Rank>;
  sp12_hard: Map<string, Rank>;
  dp_normal: Map<string, Rank>;
}

let tables: DifficultyTables | null = null;

export async function Difficulty(): Promise<DifficultyTables> {
  if (tables) return tables;
  tables = { sp12_normal: new Map(), sp12_hard: new Map(), dp_normal: new Map() };
  if (IO.Exists("data/difficulty.json")) {
    const data = JSON.parse(await IO.ReadFile("data/difficulty.json", "utf-8"));
    for (const name of Object.keys(tables))
      for (const [mid, chart, value, label] of data.tables?.[name]?.entries ?? []) tables[name].set(`${mid}:${chart}`, { value, label });
  }
  return tables;
}

/**
 * How hard a lamp on a chart is, on one scale with the levels: the level itself, but SP☆12 by the
 * reference table's rank for that lamp (F 11.6 .. S+ 12.5; null when the table has no rank yet) and
 * DP HYPER .. LEGGENDARIA by the unofficial table (it rates normal clears; hard ones use it too).
 */
export function ChartDifficulty(t: DifficultyTables, mid: number, chart: number, level: number, lamp: number): number | null {
  const key = `${mid}:${chart}`;
  if (chart >= 5) return t.dp_normal.get(key)?.value ?? level;
  if (level < 12) return level;
  const rank = (lamp >= 5 ? t.sp12_hard : t.sp12_normal).get(key);
  return rank ? 11.5 + rank.value / 10 : null;
}
