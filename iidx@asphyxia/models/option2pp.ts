// What a pair of players shares in a 2 player play (IIDX 33): pc.save2pp -> gameSystem option_2pp.
// One per pair of IIDX IDs in their order (1P:2P). Plugin space.
export interface option_2pp {
  collection: "option_2pp";
  version: number;

  key: string; // "<1P IIDX ID>:<2P IIDX ID>"
  values: Record<string, number | boolean>;
}
