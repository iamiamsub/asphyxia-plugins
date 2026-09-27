import { mygoal } from "../models/mygoal";
import { GetVersion, IDtoRef } from "../util";

// MY GOAL (IIDX 33). pc.mygoalset sets a goal per play style (a level, a clear lamp or a DJ LEVEL,
// a number of songs); pc.get hands it back in activity/mygoal; music.reg says whether the song met
// it (is_mygoal_clear, mygoal_id) and the client counts it only when <goal_status status="0"/>
// comes back; pc.mygoalclear asks for the reward once the count is reached (the client shows it
// but does not add it); pc.mygoalcancel drops the goal. The answers of the three pc methods carry
// goal_status@, anything but 0 is shown as a server error.
// The client has no rule for the period or the reward.

const DAYS = 30;
const REWARD = 100; // EX ORB, added to the balance at the credit's pc.save (gift_orb)

const now = () => Math.floor(Date.now() / 1000);
const refidOf = async (data) => await IDtoRef(Number($(data).attr().iidxid));
const status = (value: number) => ({ goal_status: K.ATTR({ goal_status: String(value) }) });

/** The style's goal, or null; a goal past its period is dropped. */
async function load(refid: string, version: number, play_style: number) {
  const goal = await DB.FindOne<mygoal>(refid, { collection: "mygoal", version, play_style });
  if (_.isNil(goal)) return null;
  if (goal.till > now()) return goal;
  await DB.Remove<mygoal>(refid, { collection: "mygoal", version, play_style });
  return null;
}

/** pc.get: the goals with the days left, for activity/mygoal. */
export async function MyGoals(refid: string, version: number) {
  const goals = [await load(refid, version, 0), await load(refid, version, 1)].filter((goal) => !_.isNil(goal));
  return goals.map((goal) => ({ ...goal, remaining_days: Math.ceil((goal.till - now()) / 86400) }));
}

export const pcmygoalset: EPR = async (info, data, send) => {
  const version = GetVersion(info), refid = await refidOf(data), attr = $(data).attr();
  if (_.isNil(refid)) return send.object(status(1));

  const since = now(), till = since + DAYS * 86400, play_style = Number(attr.play_style);
  await DB.Upsert<mygoal>(refid, { collection: "mygoal", version, play_style }, {
    collection: "mygoal", version, play_style, goal_id: since, since, till,
    difficulty: Number(attr.difficulty), goal_type: Number(attr.goal_type), goal_detail: Number(attr.goal_detail),
    goal_music_num: Number(attr.goal_music_num), progress: 0,
  });
  return send.object({
    ...status(0),
    goal: K.ATTR({ goal_id: String(since), since: String(since), till: String(till), remaining_days: String(DAYS) }),
  });
};

export const pcmygoalclear: EPR = async (info, data, send) => {
  const version = GetVersion(info), refid = await refidOf(data), attr = $(data).attr();
  const play_style = Number(attr.play_style);
  const goal = _.isNil(refid) ? null : await load(refid, version, play_style);
  if (_.isNil(goal) || goal.goal_id != Number(attr.goal_id) || goal.progress < goal.goal_music_num) return send.object(status(1));

  await DB.Remove<mygoal>(refid, { collection: "mygoal", version, play_style });
  await DB.Update(refid, { collection: "pcdata", version }, { $inc: { gift_orb: REWARD } });
  return send.object({ ...status(0), goal: K.ATTR({ reward: String(REWARD) }) });
};

export const pcmygoalcancel: EPR = async (info, data, send) => {
  const version = GetVersion(info), refid = await refidOf(data);
  if (!_.isNil(refid)) await DB.Remove<mygoal>(refid, { collection: "mygoal", version, play_style: Number($(data).attr().play_style) });
  return send.object(status(0));
};

/** music.reg (33): true when the song counts for the style's goal (the client said it met it). */
export async function CountMyGoal(refid: string, version: number, clid: number, data) {
  const attr = $(data).attr();
  if (_.isNil(refid) || Number(attr.is_mygoal_clear) != 1) return false;

  const play_style = clid >= 5 ? 1 : 0;
  const goal = await load(refid, version, play_style);
  if (_.isNil(goal) || goal.goal_id != Number(attr.mygoal_id) || goal.progress >= goal.goal_music_num) return false;
  await DB.Update<mygoal>(refid, { collection: "mygoal", version, play_style }, { $inc: { progress: 1 } });
  return true;
}
