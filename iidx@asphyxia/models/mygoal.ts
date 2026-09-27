// A MY GOAL the player set, one per play style (IIDX 33).
export interface mygoal {
  collection: "mygoal";
  version: number;

  play_style: number; // 0 SP, 1 DP
  goal_id: number; // since, so every goal gets its own
  since: number; // unix seconds
  till: number;
  difficulty: number; // level 1..12
  goal_type: number; // 0 clear lamp, 1 DJ LEVEL
  goal_detail: number; // the lamp 1..7 (at least) or the DJ LEVEL 0 AAA..7 F (at most)
  goal_music_num: number; // songs to play
  progress: number; // songs played
}
