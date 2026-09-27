// Qpro treasure (activity weekly reward) and the PREMIUM FREE +60 second tickets, IIDX 33.
//
// pc.get activity weekly_reward tells the client how many weeks were counted (week_num), how many
// it was paid for (get_reward_num), how often the treasure was dug (dig_num), whether this week is
// still to count (update) and whether the treasure can be dug (digok). A dig gives 10 ORB for every
// unpaid week, and every 12 digs the 4th gives 20 ORB, the 8th a PREMIUM FREE ticket and the 12th a
// WORLD TOURISM ticket. The client sends the counts back in pc.save activity_weekly_reward, and the
// tickets in premiumfree_data / world_tourism_ticket (add_ticket got, use_ticket used this credit).
// The client has no rule for the weeks: this server counts the weeks a player plays, so the
// treasure can be dug once a week.

import { pcdata } from "../models/pcdata";

/** Weeks since the epoch, starting on Mondays (UTC). */
export const WeekId = (time = Date.now()) => Math.floor((time / 86400000 + 3) / 7);

/** pc.get: the weekly_reward attributes and flags. */
export function WeeklyReward(data: pcdata) {
  const week_num = data.wr_week_num || 0, get_reward_num = data.wr_get_reward_num || 0;
  const update = data.wr_week !== WeekId() ? 1 : 0;
  return { week_num, get_reward_num, dig_num: data.wr_dig_num || 0, update, digok: week_num + update > get_reward_num ? 1 : 0 };
}

/** pc.save: the weekly reward counts and the PREMIUM FREE tickets. */
export function SaveWeeklyReward(data: pcdata, request) {
  const reward = $(request).element("activity_weekly_reward");
  if (!_.isNil(reward)) {
    const week_num = Number(reward.attr().week_num) || 0;
    if (week_num > (data.wr_week_num || 0)) data.wr_week = WeekId(); // the client counted this week
    data.wr_week_num = week_num;
    data.wr_get_reward_num = Number(reward.attr().get_reward_num) || 0;
    const dig = reward.element("activity_weekly_dig");
    if (!_.isNil(dig)) data.wr_dig_num = Number(dig.attr().dig_num) || 0;
  }

  const ticket = $(request).element("premiumfree_data");
  if (!_.isNil(ticket)) {
    const add = Number(ticket.attr().add_ticket) || 0, use = Number(ticket.attr().use_ticket) || 0;
    data.pf_ticket = Math.max(0, (data.pf_ticket || 0) + add - use);
  }
}
