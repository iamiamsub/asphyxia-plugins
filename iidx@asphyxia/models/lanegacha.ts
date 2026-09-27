// RANDOM lane tickets a player holds (Sparkle Shower), one document per ticket.
export interface lane_gacha_ticket {
  collection: "lane_gacha_ticket";
  version: number;

  ticket_id: number; // unique per player
  arrange_id: number; // one of the 7! = 5040 lane orders, 0..5039
}

// The rest of a player's RANDOM lane tickets: what is equipped, the window's tab, free draws, favorites.
export interface lane_gacha {
  collection: "lane_gacha";
  version: number;

  next_id: number;
  free: number;
  set_sp: number; // equipped ticket_id, -1 for none
  set_dp_left: number;
  set_dp_right: number;
  last_page: number;
  favorite: string[]; // up to 10 lane orders ("1234567") for the number filter
}
