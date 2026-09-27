// Tsujigiri battle (IIDX 33), one per player and version.
export interface tsujigiri {
  collection: "tsujigiri";
  version: number;

  total_num_sp: number; // rivals passed in normal tsujigiri
  total_num_dp: number;
  appearance_id: number; // the day (JstDate) defeat_flg belongs to
  defeat_flg: number; // bits 0..2: which of that day's 3 characters are beaten
  defeat: number[]; // by character 0..29: times beaten
  encount: number[]; // by character 0..29: when first met (unix seconds, 0 = never)
}
