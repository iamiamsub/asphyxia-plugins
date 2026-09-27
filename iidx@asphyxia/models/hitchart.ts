// One play (music.reg) kept for the hit chart. Plugin space, not tied to a profile.
export interface hitchart_play {
  collection: "hitchart_play";

  mid: number;
  time: number; // unix seconds
}
