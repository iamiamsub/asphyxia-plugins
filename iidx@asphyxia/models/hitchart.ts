// One play (music.reg / music.play / music.nosave) kept for the hit chart. Plugin space, not tied to a profile.
export interface hitchart_play {
  collection: "hitchart_play";

  version?: number; // missing on plays kept before it was recorded
  mid: number;
  time: number; // unix seconds
}
