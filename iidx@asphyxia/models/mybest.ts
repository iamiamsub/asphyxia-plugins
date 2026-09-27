// How often a player played a song in one style, for the MYBEST folder (music.getrank <best>).
// Profile space, across versions like score.
export interface mybest_count {
  collection: "mybest_count";

  play_style: number; // 0 SP, 1 DP
  mid: number;
  count: number;
  last: number; // unix seconds of the latest play
}
