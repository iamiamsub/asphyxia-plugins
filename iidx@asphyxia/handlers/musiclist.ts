// The game's song list, imported on the Customize Images page from the player's own
// music_data.bin (or music_omni.bin) per version: webui/asset/music/<version>.json holds
// [music id, version, title, [10 chart levels]] per song. The features that choose songs (today's
// pick, ...) choose from it; without one they fall back to the songs someone here has a score of.

const DIR = "webui/asset/music";
const VERSIONS = [31, 32, 33];
const SPECIAL = [16072, 16080, 16081, 16082, 33333]; // system songs the game keeps out of its lists

export type MusicEntry = [number, number, string, number[]];

const cache = new Map<number, MusicEntry[]>();

/** The imported list of a version, or null. */
export async function MusicList(version: number): Promise<MusicEntry[] | null> {
  if (cache.has(version)) return cache.get(version);
  const file = `${DIR}/${version}.json`;
  if (!IO.Exists(file)) return null;
  const list = JSON.parse(await IO.ReadFile(file, "utf-8")) as MusicEntry[];
  cache.set(version, list);
  return list;
}

/** Music ids a version can play and that songs may be chosen from, sorted. */
export async function MusicPool(version: number): Promise<number[]> {
  const list = await MusicList(version);
  const ids = list
    ? list.filter(([id, ver, , levels]) => ver <= version && levels.some((l) => l > 0)).map(([id]) => id)
    : (await DB.Find<any>(null, { collection: "score" })).map((s) => s.mid).filter((mid) => Math.floor(mid / 1000) <= version);
  return Array.from(new Set(ids)).filter((id) => id > 0 && !SPECIAL.includes(id)).sort((a, b) => a - b);
}

/** WebUI: { version, songs: MusicEntry[] } from the browser, which read the game's file. */
export const importMusicList = async (data: { version?: number; songs?: any[] }, send: WebUISend) => {
  const version = Number(data.version);
  if (!VERSIONS.includes(version)) return send.error(400, "unknown version");
  const songs: MusicEntry[] = [];
  for (const s of Array.isArray(data.songs) ? data.songs.slice(0, 5000) : []) {
    const [id, ver, title, levels] = Array.isArray(s) ? s : [];
    if (!Number.isInteger(id) || id <= 0 || id > 99999 || !Number.isInteger(ver) || ver < 0 || ver > 99) continue;
    if (!Array.isArray(levels) || levels.length != 10) continue;
    songs.push([id, ver, String(title ?? "").slice(0, 200), levels.map((l) => Math.min(12, Math.max(0, Number(l) || 0)))]);
  }
  if (!songs.length) return send.error(400, "no songs");
  await IO.WriteFile(`${DIR}/${version}.json`, JSON.stringify(songs), null);
  cache.delete(version);
  send.json({ saved: songs.length });
};

/** The number of songs in each version's list. */
export async function MusicListStatus() {
  const result: Record<number, number> = {};
  for (const version of VERSIONS) {
    const list = await MusicList(version);
    if (list) result[version] = list.length;
  }
  return result;
}
