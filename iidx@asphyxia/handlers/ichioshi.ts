import { pcdata } from "../models/pcdata";
import { JstDate, Random } from "../util";
import { MusicPool } from "./musiclist";

// Today's pick (今日のイチオシ, IIDX 33): 3 songs a day. pc.get <packinfo pack_id@ music_0..2@> are
// the day's songs and <achievements pack@> which of them the player has played that day (bits
// 0..2). The client marks a song when it is played, and at card out sends the bits (pack_flg@)
// with the pack_id@ it got; when the bits first become 7 it counts one more completion itself
// (pack_comp@, the badge's count) (bm2dx CAchieveGameData::LoadFeaturedMusic / OnFeaturedMusicPlayed,
// PlayerData_SetAchieveFlags). Days change at midnight JST; the songs are drawn from the song list
// with the date as the seed, so every player and every login of the day gets the same three.

/** The day's pack: its id and 3 music ids (-1 when there is nothing to choose from, or it is switched off). */
export async function TodayPack(version: number) {
  const pack_id = JstDate();
  const pool = U.GetConfig("ss_today_pick") ? await MusicPool(version) : [];
  const random = Random(pack_id), music = [];
  while (music.length < 3 && music.length < pool.length) {
    const id = pool[Math.floor(random() * pool.length)];
    if (!music.includes(id)) music.push(id);
  }
  while (music.length < 3) music.push(-1);
  return { pack_id, music };
}

/** pc.get: the bits of the day's songs the player has played (0 on a new day). */
export const TodayPackFlags = (data: pcdata, pack_id: number) => (data.achi_packid === pack_id ? data.achi_pack || 0 : 0);

/** pc.save: the bits and the day they belong to. */
export function SaveTodayPack(data: pcdata, request) {
  const a = $(request).element("achievements");
  if (_.isNil(a) || _.isNil(a.attr().pack_flg)) return;
  data.achi_pack = Number(a.attr().pack_flg) & 7;
  data.achi_packid = Number(a.attr().pack_id);
}
