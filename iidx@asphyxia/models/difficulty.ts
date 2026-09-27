// A chart's rank set on the Difficulty Tables page, over the shipped snapshot (plugin space).
export interface difficulty_override {
  collection: "difficulty_override";

  table: string; // sp12_normal, sp12_hard, dp_normal
  mid: number;
  chart: number; // style * 5 + difficulty
  value: number | null; // null: no rank (the snapshot's is taken away)
  label: string | null;
}
