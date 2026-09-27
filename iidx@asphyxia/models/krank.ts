// KAIDEN RANK (DJ TRAINING BLACK, IIDX 33), one per player and version.
export interface krank_music {
  klevel: number; // 1..7
  mid: number;
  clid: number; // the chart, as music.reg's clid
  clear_type: number; // the lamp counted for the skill
  best: number; // the tries it took (play_num_best)
  now: number; // tries today (play_num_now)
  total: number; // tries this season (play_num_total)
}

export interface krank {
  collection: "krank";
  version: number;

  season_id: number;
  music: krank_music[][]; // [SP, DP][0..6], index@ is the position
  prev_skill: number[]; // [SP, DP]: the skill of the seasons before
  element_get: number; // K-ELEMENTs got for a play of the season (up to 12 with the ones below)
  element_use: number; // used for LEGGENDARIAs
  element_append_get: number; // got for playing every song of the season
  element_append_use: number;
  element_season: number; // the season an element was got last
  append_season: number;
  reset_day: number; // the day (JstDate) the tries of the day were cleared
}
