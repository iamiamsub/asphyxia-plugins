import { lane_gacha, lane_gacha_ticket } from "../models/lanegacha";
import { GetVersion, IDtoRef } from "../util";

// RANDOM lane tickets kept per player (IIDX 33; older versions keep the tickets made at each login).
// pc.getLaneGachaTicket hands the tickets, the equipped ones (setting), the window's tab (info), the
// free draws and the favorites; pc.drawLaneGacha makes new ones (draw_num 1 with pay_money -1 is a
// free draw); pc.consumeLaneGachaTicket spends the equipped ones after a RANDOM play; pc.save sends
// what is equipped, the tab and the free draws got in the credit.

const MAX_TICKETS = 9999; // what the client holds
const EXPIRE = 2147483647; // read as s32
const FREE_DRAWS = 10; // filled up at every login, as the plugin always gave
const FIRST_TICKETS = 100; // the tickets the plugin handed at every login, given once

const arrange = () => _.random(0, 5039);
const refidOf = async (data) => await IDtoRef(Number($(data).attr().iidxid));
const num = (value: any, otherwise: number) => (Number.isFinite(Number(value)) && value !== "" && !_.isNil(value) ? Number(value) : otherwise);

async function load(refid: string, version: number): Promise<lane_gacha> {
  const saved = await DB.FindOne<lane_gacha>(refid, { collection: "lane_gacha", version });
  if (!_.isNil(saved)) return saved;

  const fresh: lane_gacha = {
    collection: "lane_gacha", version, next_id: 1, free: FREE_DRAWS,
    set_sp: -1, set_dp_left: -1, set_dp_right: -1, last_page: 0, favorite: [],
  };
  for (let i = 0; i < FIRST_TICKETS; i++)
    await DB.Insert<lane_gacha_ticket>(refid, { collection: "lane_gacha_ticket", version, ticket_id: fresh.next_id++, arrange_id: arrange() });
  await store(refid, fresh);
  return fresh;
}

async function store(refid: string, state: lane_gacha) {
  const { collection, version, ...values } = state;
  await DB.Upsert<lane_gacha>(refid, { collection: "lane_gacha", version }, { $set: values });
}

const ticketNode = (t: { ticket_id: number; arrange_id: number }) =>
  K.ATTR({ ticket_id: String(t.ticket_id), arrange_id: String(t.arrange_id), expire_date: String(EXPIRE) });

/** pc.getLaneGachaTicket (33): null for the older behavior. */
export async function LaneGachaGet(info: EamuseInfo, data) {
  const version = GetVersion(info), refid = await refidOf(data);
  if (version < 33 || _.isNil(refid)) return null;

  const state = await load(refid, version);
  if (state.free < FREE_DRAWS) {
    state.free = FREE_DRAWS;
    await store(refid, state);
  }
  const tickets = await DB.Find<lane_gacha_ticket>(refid, { collection: "lane_gacha_ticket", version });
  return {
    ticket: tickets.map(ticketNode),
    setting: K.ATTR({ sp: String(state.set_sp), dp_left: String(state.set_dp_left), dp_right: String(state.set_dp_right) }),
    info: K.ATTR({ last_page: String(state.last_page) }),
    free: K.ATTR({ num: String(state.free) }),
    favorite: state.favorite.map((a) => K.ATTR({ arrange: a })),
  };
}

/** pc.drawLaneGacha (33): null for the older behavior. */
export async function LaneGachaDraw(info: EamuseInfo, data) {
  const version = GetVersion(info), refid = await refidOf(data);
  if (version < 33 || _.isNil(refid)) return null;

  const state = await load(refid, version);
  const held = (await DB.Find<lane_gacha_ticket>(refid, { collection: "lane_gacha_ticket", version })).length;
  const count = Math.max(0, Math.min(num($(data).attr().draw_num, 0), MAX_TICKETS - held));
  if (num($(data).attr().pay_money, 0) == -1) state.free = Math.max(0, state.free - 1);

  const drawn = [];
  for (let i = 0; i < count; i++) {
    const t = { ticket_id: state.next_id++, arrange_id: arrange() };
    await DB.Insert<lane_gacha_ticket>(refid, { collection: "lane_gacha_ticket", version, ...t });
    drawn.push(t);
  }
  await store(refid, state);
  return { ticket: drawn.map(ticketNode), session: K.ATTR({ session_id: "0" }) };
}

export const pcconsumelanegacha: EPR = async (info, data, send) => {
  const version = GetVersion(info), refid = await refidOf(data);
  if (version >= 33 && !_.isNil(refid))
    for (const id of [num($(data).attr().ticket_id, -1), num($(data).attr().ticket_id2, -1)])
      if (id >= 0) await DB.Remove<lane_gacha_ticket>(refid, { collection: "lane_gacha_ticket", version, ticket_id: id });
  return send.success();
};

/** pc.save (33): the equipped tickets, the window's tab and the free draws got in the credit. */
export async function LaneGachaSave(refid: string, version: number, data) {
  const equip = $(data).element("lane_gacha_ticket"), tab = $(data).element("lane_gacha_info"), free = $(data).element("lane_gacha_free");
  if (_.isNil(equip) && _.isNil(tab) && _.isNil(free)) return;

  const state = await load(refid, version);
  if (!_.isNil(equip)) {
    state.set_sp = num(equip.attr().set_sp, -1);
    state.set_dp_left = num(equip.attr().set_dp_left, -1);
    state.set_dp_right = num(equip.attr().set_dp_right, -1);
  }
  if (!_.isNil(tab)) state.last_page = num(tab.attr().last_page, 0);
  if (!_.isNil(free)) state.free += num(free.attr().get_num, 0);
  await store(refid, state);
}
