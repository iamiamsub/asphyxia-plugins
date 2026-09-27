// A player's best EX on the week's song, per week and chart (WEEKLY RANKING, IIDX 33).
export interface weekly_score {
  collection: "weekly_score";
  version: number;

  wid: number; // the week
  clid: number; // the chart, 1..3 SP N/H/A, 6..8 DP N/H/A
  mid: number; // the week's song
  score: number; // EX
  time: number; // when that score was first reached (unix seconds): ties go to the earlier
}
