export interface badge {
  collection: "badge";
  version: number;

  category_name: string;
  flg_id: number;
  flg: number | string; // an s64 bit set, kept as its text: Number() rounds it past 2^53
}

// A badge shown in one of the 5 slots (IIDX 33). Only the server sets them (the WebUI here): the
// client never sends them, and it drops a slot whose badge the player does not have.
export interface badge_equip {
  collection: "badge_equip";
  version: number;

  slot: number; // 0..4
  category_id: number; // as in badge_data
  badge_flg_id: number;
  index: number; // the bit of badge_flg
}

export const badgeBaseMap: Record<string, number> = {
  djLevel: 0,
  clear: 1,
  grade: 2,
};

export const badgeVersionMap: Record<number | "default", Record<string, number>> = {
  30: {
    visitor: 6,
    notes_radar: 7,
    world_tourism: 8,
    event1: 9,
  },
  31: {
    step_up: 3,
    visitor: 6,
    notes_radar: 7,
    event1: 13,
    event2: 16,
  },
  32: {
    step_up: 3,
    visitor: 6,
    notes_radar: 7,
    event1: 13,
    event2: 15,
  },
  // bm2dx 2026081900: pc.save keeps its badges in the same order and spacing as the
  // category_id slots Xrpc_PcGet_Parse fills (bpl_supporter is category 11, flg_id 2)
  33: {
    step_up: 3,
    today_recommend: 4,
    weekly_ranking: 5,
    visitor: 6,
    notes_radar: 7,
    dj_training: 8,
    tsujigiri: 9,
    iidx_exam: 10,
    bpl_supporter: 11,
    arena: 12,
    special: 2000, // music.reg special_badge_flg (ONE MORE EXTRA)
    event1: 3301,
  },
  default: {
    step_up: 3,
    visitor: 7,
    notes_radar: 8,
    world_tourism: 12,
  },
};
