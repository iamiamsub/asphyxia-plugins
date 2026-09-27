export interface djtraining {
  collection: "djtraining";
  version: number;
  play_style: number;

  tier: number;
  part: number;
  midx: number;
  cflg: number;
}

/** DJ TRAINING progress per style [SP, DP]: the color (6 = BLACK) and the Parts of it passed. */
export interface djtraining_progress {
  collection: "djtraining_progress";
  version: number;

  tier: number[];
  step: number[];
}
