import { mybest_count } from "../models/mybest";

// MYBEST folder (IIDX 33): music.getrank <best rno="-1"> holds 20 music ids (u16) per style, the
// folder's songs in its default order (MusicSort_ByMyBestOrder); ids under 100 and 0 are empty.
// The client has no rule for them: this server lists the player's most played songs.

const COUNT = 20;

/** music.reg: one more play of the song in the style of clid (0-4 SP, 5-9 DP). */
export async function CountMyBestPlay(refid: string, clid: number, mid: number) {
  if (!(mid > 0)) return;
  await DB.Upsert<mybest_count>(
    refid,
    { collection: "mybest_count", play_style: clid >= 5 ? 1 : 0, mid },
    { $inc: { count: 1 }, $set: { last: Math.floor(Date.now() / 1000) } }
  );
}

/** music.getrank: the style's 20 most played songs (ties: played last first), 0 for the rest. */
export async function MyBest(refid: string, play_style: number, version: number) {
  const counts = await DB.Find<mybest_count>(refid, { collection: "mybest_count", play_style });
  const ids = counts
    .filter((c) => Math.floor(c.mid / 1000) <= version)
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, COUNT)
    .map((c) => c.mid);
  while (ids.length < COUNT) ids.push(0);
  return K.ARRAY("u16", ids, { rno: "-1" });
}
