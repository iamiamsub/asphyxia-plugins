export const IIDX_CPUS = [
  [
    [6, 4, 5, 0],
    [7, 5, 6, 0],
    [8, 6, 6, 0],
    [9, 6, 7, 0],
    [10, 7, 7, 0],
    [10, 7, 8, 0],
    [11, 8, 8, 0],
    [11, 8, 9, 0],
    [12, 9, 9, 0],
    [12, 9, 10, 0],
    [13, 9, 10, 0],
    [13, 10, 10, 0],
    [14, 10, 11, 0],
    [14, 10, 11, 1],
    [15, 11, 11, 1],
    [15, 11, 12, 1],
    [16, 11, 12, 1],
    [16, 11, 12, 1],
    [17, 12, 12, 1],
    [18, 12, 12, 1],
  ],
  [
    [6, 3, 5, 0],
    [7, 3, 5, 0],
    [8, 4, 5, 0],
    [8, 4, 5, 0],
    [9, 5, 6, 0],
    [9, 5, 6, 0],
    [10, 6, 6, 0],
    [10, 6, 7, 0],
    [11, 7, 7, 0],
    [11, 7, 8, 0],
    [12, 8, 8, 0],
    [12, 8, 9, 0],
    [13, 9, 9, 0],
    [13, 9, 10, 0],
    [14, 9, 10, 0],
    [15, 10, 10, 0],
    [15, 10, 11, 0],
    [16, 11, 11, 1],
    [17, 11, 12, 1],
    [18, 12, 12, 1],
  ],
];

// ARENA record of a player (Sparkle Shower), what pc.save arena_data sends and pc.get gives back
export interface arena_style {
  play_num: number; // ARENA credits of the style (0: the client works out the first class)
  arena_class: number; // 0..19
  rating_value: number;
  now_top_class_continuing: number;
  best_top_class_continuing: number;
  win_count: number;
  now_winning_streak_count: number;
  best_winning_streak_count: number;
  perfect_win_count: number;
  counterattack_num: number;
  mission_clear_num: number;
}

export interface arena_record {
  collection: "arena_record";
  version: number;

  play_num: number;
  cube: number; // cubes got (the arena_reward track)
  styles: arena_style[]; // SP, DP
}
