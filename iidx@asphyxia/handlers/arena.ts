import { arena_record, arena_style } from "../models/arena";

// ARENA (IIDX 33, bm2dx 2026081900). The client works out the class and the rating after each ARENA
// credit (CArenaAchieveGameData::CalcRatingDelta / CalcNewClass, classes 0..19) and sends them in pc.save
// arena_data; pc.get gives them back. A style with no ARENA play yet (play_num_sp / dp 0) gets its first
// class from the client when matching starts (CalcInitialClass: the scores, the dan, the previous season's
// best class). The plugin used to send class 19 with one play each, so everyone stayed at the top class
// and the CPUs, which play at the class's levels (arena_cpu_define), threw level 12 charts.

const style = (): arena_style => ({
  play_num: 0, arena_class: 0, rating_value: 0, now_top_class_continuing: 0, best_top_class_continuing: 0,
  win_count: 0, now_winning_streak_count: 0, best_winning_streak_count: 0, perfect_win_count: 0,
  counterattack_num: 0, mission_clear_num: 0,
});

async function load(refid: string, version: number): Promise<arena_record> {
  const saved = await DB.FindOne<arena_record>(refid, { collection: "arena_record", version });
  return { collection: "arena_record", version, play_num: 0, cube: 0, styles: [style(), style()], ...(saved ?? {}) };
}

/** pc.get arena_data: the saved record, or none played yet. */
export async function Arena(refid: string, version: number) {
  return load(refid, version);
}

/** pc.save arena_data: play_num, the styles' achieve_data (sent for a style whose values changed) and cube_data. */
export async function SaveArena(refid: string, version: number, data) {
  const node = $(data).element("arena_data");
  if (_.isNil(node)) return;
  const a = await load(refid, version);
  const n = (v) => Number(v) || 0;
  if (!_.isNil(node.attr().play_num)) a.play_num = n(node.attr().play_num);
  for (const e of node.elements("achieve_data")) {
    const at = e.attr(), s = n(at.play_style);
    if (s !== 0 && s !== 1) continue;
    const st = a.styles[s];
    st.play_num = Math.max(st.play_num + 1, 1);
    st.arena_class = n(at.arena_class);
    st.rating_value = n(at.rating_value);
    st.now_top_class_continuing = n(at.now_top_class_continuing);
    st.best_top_class_continuing = Math.max(st.best_top_class_continuing, st.now_top_class_continuing);
    st.win_count = n(at.win_count);
    st.now_winning_streak_count = n(at.winning_streak_count);
    st.best_winning_streak_count = Math.max(st.best_winning_streak_count, st.now_winning_streak_count);
    st.perfect_win_count = n(at.perfect_win_count);
    st.counterattack_num = n(at.counterattack_num);
    st.mission_clear_num = n(at.mission_clear_num);
  }
  const cube = node.element("cube_data");
  if (!_.isNil(cube)) a.cube = n(cube.attr().cube);
  await DB.Upsert<arena_record>(refid, { collection: "arena_record", version }, a);
}
