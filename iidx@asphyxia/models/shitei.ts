// Master and disciple (師弟) and the bingo cards (IIDX 33).

/** A player's side of it, one per version. */
export interface shitei {
  collection: "shitei";
  version: number;

  master_refid: string; // "" without a master
  clear_disciple: number; // disciples who completed a card of this master
  discple_card_clear_num: number; // cards of this master the disciples completed
  my_card_card_clear_num: number; // MY BINGO CARDs completed
  masters_cleared: number; // MASTERS BINGO CARDs this player completed (as a disciple)
}

export interface bingo_mass {
  music_id: number;
  play_style: number; // 0 SP, 1 DP
  note_detail: number; // 0 BEGINNER .. 4 LEGGENDARIA
  clear_type: number; // the lamp asked for, 2 ASSIST .. 7 FULL COMBO
  is_clear: boolean;
}

/** A card: the active one of a card_type, then kept as "cleared" or "expired". */
export interface bingo_card {
  collection: "bingo_card";
  version: number;

  card_type: number; // 0 MASTERS BINGO CARD, 1 MY BINGO CARD
  week: number; // JstWeek it was made for
  seq: number; // cards made of this type in that week before it
  state: "active" | "cleared" | "expired";
  author_refid: string; // the master for a MASTERS card
  mass: bingo_mass[]; // 9, 16 or 25
}
