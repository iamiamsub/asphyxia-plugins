import { option_2pp } from "../models/option2pp";
import { GetVersion } from "../util";

// 2 player shared settings (IIDX 33). When both players are in with a card, the game sends
// pc.save2pp at card out (camera layout, M-RANDOM, and on TDJ the cabinet lights and sound);
// systemInfo, sent at every login with both IIDX IDs, gets them back as option_2pp, applied only
// when both are in and is_valid. The client imports option_2pp with a fixed table
// (g_Psmap_SysInfoOption2pp): every field with its type, or systemInfo fails; leaving the node
// out is fine.

// in the table's order
const FIELDS: [string, "s32" | "bool"][] = [
  ["camera_layout", "s32"],
  ["ceiling_left", "bool"], ["ceiling_right", "bool"],
  ["side_inner_left", "bool"], ["side_inner_right", "bool"],
  ["side_center_left", "bool"], ["side_center_right", "bool"],
  ["side_outer_left", "bool"], ["side_outer_right", "bool"],
  ["touch_panel_left", "bool"], ["touch_panel_right", "bool"],
  ["vefx", "s32"], ["low_eq", "s32"], ["low_mid_eq", "s32"], ["hi_mid_eq", "s32"], ["hi_eq", "s32"],
  ["filter", "s32"], ["play_volume", "s32"],
  ["m_random_1p", "bool"], ["m_random_2p", "bool"], ["video_hide_name", "bool"],
];

const pair = (data) => {
  const id0 = $(data).str("iidx_id_0"), id1 = $(data).str("iidx_id_1");
  return id0 && id1 ? `${id0}:${id1}` : null;
};

export const pcsave2pp: EPR = async (info, data, send) => {
  const version = GetVersion(info), key = pair(data);
  if (version >= 33 && key) {
    const values = {};
    for (const [name, type] of FIELDS) values[name] = type == "bool" ? $(data).bool(name) : $(data).number(name, 0);
    await DB.Upsert<option_2pp>({ collection: "option_2pp", version, key }, { $set: { values } });
  }
  return send.success();
};

/** systemInfo: the option_2pp node for the pair in the request, or null. */
export async function Option2pp(version: number, data) {
  const key = pair(data);
  if (version < 33 || !key) return null;
  const saved = await DB.FindOne<option_2pp>({ collection: "option_2pp", version, key });
  if (_.isNil(saved)) return null;

  const node = {};
  for (const [name, type] of FIELDS)
    node[name] = type == "bool" ? K.ITEM("bool", saved.values[name] ? 1 : 0) : K.ITEM("s32", Number(saved.values[name]) || 0);
  node["is_valid"] = K.ITEM("bool", 1);
  return node;
}
