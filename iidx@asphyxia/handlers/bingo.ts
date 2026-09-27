import { bingo_card, bingo_mass, shitei } from "../models/shitei";
import { score } from "../models/score";
import { Hash, IDtoRef, JstWeek, Random } from "../util";
import { PlayableSongs } from "./musiclist";
import { ChartDifficulty, Difficulty } from "./difficulty";

// Master and disciple (師弟) bingo (IIDX 33, bm2dx 2026081900). pc.get <shitei> gives the player's
// cards: card_type 0 is the MASTERS BINGO CARD (folder 0xc6), 1 the MY BINGO CARD (0xc7), 9, 16 or 25
// cells {music_id, play_style, note_detail, clear_type (the lamp asked for), is_clear}. The client
// does the rest: a result at that lamp or higher clears the cell, and it pays DELLAR for new lines
// and the whole card (deller@ in pc.save). pc.save <shitei> carries the cards back with is_clear,
// and in the 1P save the master and disciple two players paired at the mode select (IIDX ids).
// The client has no rule for the cards: this server makes a MY card (3x3) each week (JST, from
// Wednesday) and, for a player with a master, a MASTERS card (4x4), from the imported song list:
// CLEAR and HARD cells each just under where the player is at that lamp, measured by the difficulty
// tables (SP☆12 by the reference table of the lamp, DP by the unofficial table, the level
// otherwise), charts without the lamp yet first. A completed card is replaced at the next login; a
// MASTERS card completed pays the master too.

const SIZE = [16, 9]; // by card_type
const MASTER_REWARD: Record<number, number> = { 9: 200, 16: 300, 25: 400 }; // DELLAR, as the client pays for a whole card

async function loadShitei(refid: string, version: number): Promise<shitei> {
  const saved = await DB.FindOne<shitei>(refid, { collection: "shitei", version });
  return {
    collection: "shitei", version, master_refid: "", clear_disciple: 0, discple_card_clear_num: 0,
    my_card_card_clear_num: 0, masters_cleared: 0, ...(saved ?? {}),
  };
}

async function storeShitei(refid: string, data: shitei) {
  const { collection, version, master_refid, clear_disciple, discple_card_clear_num, my_card_card_clear_num, masters_cleared } = data;
  await DB.Upsert<shitei>(refid, { collection: "shitei", version }, {
    collection, version, master_refid, clear_disciple, discple_card_clear_num, my_card_card_clear_num, masters_cleared,
  });
}

/** A new card of the player's style (the one played more) at the level they clear. */
async function MakeCard(refid: string, version: number, card_type: number, week: number, seq: number, author: string): Promise<bingo_card | null> {
  const songs = await PlayableSongs(version);
  if (songs.length == 0) return null;
  const pcdata = await DB.FindOne<any>(refid, { collection: "pcdata", version });
  const style = (pcdata?.dpnum ?? 0) > (pcdata?.spnum ?? 0) ? 1 : 0;
  const lamps = new Map((await DB.Find<score>(refid, { collection: "score" })).map((s) => [s.mid, s.cArray ?? []]));
  const tables = await Difficulty();
  const random = Random(Hash(refid) ^ Math.imul(week, 31) ^ Math.imul(card_type + 1, 7919) ^ Math.imul(seq, 131));

  // every NORMAL .. LEGGENDARIA chart of the style with how hard each lamp is on it (ChartDifficulty)
  const charts: { mid: number; d: number; level: number; lamp: number }[] = [];
  for (const [id, , , levels] of songs)
    for (let d = 1; d < 5; d++) if (levels[style * 5 + d] > 0) charts.push({ mid: id, d, level: levels[style * 5 + d], lamp: lamps.get(id)?.[style * 5 + d] ?? 0 });
  const difficulty = (c: (typeof charts)[0], lamp: number) => ChartDifficulty(tables, c.mid, style * 5 + c.d, c.level, lamp);

  // the player at a lamp: 80% of the charts they have it on are at or under this (6 with too few);
  // cells come from just under it, a narrower band inside SP☆12 where the ranks are 0.1 apart
  const ability = (lamp: number): number => {
    const got = charts.filter((c) => c.lamp >= lamp).map((c) => difficulty(c, lamp)).filter((v) => v !== null).sort((a, b) => a - b);
    if (got.length < 5) return lamp > 4 ? ability(4) - 1 : 6;
    return got[Math.min(got.length - 1, Math.floor(got.length * 0.8))];
  };
  const pick = (lamp: number, count: number, taken: number[]) => {
    const top = ability(lamp), width = style == 0 && top >= 11.55 ? 0.4 : 1;
    const [low, high] = card_type == 1 ? [top - width, top] : [top - width / 2, top + width * 0.3];
    const band = charts.filter((c) => {
      const v = difficulty(c, lamp);
      return v !== null && v >= low - 1e-9 && v <= high + 1e-9;
    });
    for (let i = band.length - 1; i > 0; i--) { // shuffle
      const j = Math.floor(random() * (i + 1));
      [band[i], band[j]] = [band[j], band[i]];
    }
    // charts without that lamp yet first, one per song (a song played again in a credit does not count)
    const out: bingo_mass[] = [];
    for (const c of [...band.filter((c) => c.lamp < lamp), ...band.filter((c) => c.lamp >= lamp)])
      if (out.length < count && !taken.includes(c.mid) && !out.some((m) => m.music_id == c.mid))
        out.push({ music_id: c.mid, play_style: style, note_detail: c.d, clear_type: lamp, is_clear: false });
    return out;
  };

  const size = SIZE[card_type], hard = Math.round(size * (card_type == 1 ? 0.25 : 0.4));
  const cells = pick(5, hard, []);
  cells.push(...pick(4, size - cells.length, cells.map((m) => m.music_id)));
  if (cells.length < size) return null;
  for (let i = cells.length - 1; i > 0; i--) { // the HARD cells anywhere on the card
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return { collection: "bingo_card", version, card_type, week, seq, state: "active", author_refid: author, mass: cells };
}

/** The active card of a type for this week, made when there is none (or the last is done or old). */
async function ActiveCard(refid: string, version: number, card_type: number, author: string) {
  const week = JstWeek(), query = { collection: "bingo_card" as const, version, card_type };
  const card = await DB.FindOne<bingo_card>(refid, { ...query, state: "active" });
  if (card && card.week == week && card.author_refid == author) return card;
  if (card) await DB.Update<bingo_card>(refid, { ...query, state: "active" }, { $set: { state: "expired" } });
  const made = await MakeCard(refid, version, card_type, week, await DB.Count<bingo_card>(refid, { ...query, week }), author);
  if (made) await DB.Insert<bingo_card>(refid, made);
  return made;
}

/** pc.get: the shitei attributes and the cards. */
export async function Bingo(refid: string, version: number) {
  const me = await loadShitei(refid, version);
  const cards = [await ActiveCard(refid, version, 1, refid)];
  if (me.master_refid) cards.unshift(await ActiveCard(refid, version, 0, me.master_refid));
  return {
    have_master: me.master_refid ? 0 : 1, // "can have one more": a master when there is none
    have_disciple: 1,
    clear_disciple: me.clear_disciple,
    discple_card_clear_num: me.discple_card_clear_num,
    my_card_card_clear_num: me.my_card_card_clear_num,
    cards: cards.filter((c) => !_.isNil(c)),
  };
}

async function CardCompleted(refid: string, version: number, card: bingo_card) {
  const me = await loadShitei(refid, version);
  if (card.card_type == 1) me.my_card_card_clear_num++;
  else me.masters_cleared++;
  await storeShitei(refid, me);
  if (card.card_type == 1 || !card.author_refid) return;

  const master = await loadShitei(card.author_refid, version);
  master.discple_card_clear_num++;
  if (me.masters_cleared == 1) master.clear_disciple++;
  await storeShitei(card.author_refid, master);
  await DB.Update(card.author_refid, { collection: "pcdata", version }, { $inc: { deller: MASTER_REWARD[card.mass.length] ?? 0 } });
}

/** pc.save: the cells cleared and a master and disciple paired. */
export async function SaveBingo(refid: string, version: number, data) {
  const node = $(data).element("shitei");
  if (_.isNil(node)) return;

  if (node.bool("shitei_agreement")) { // in the 1P save, whoever of the two is the master
    const master = await IDtoRef(Number(node.attr().master_id)), disciple = await IDtoRef(Number(node.attr().disciple_id));
    if (!_.isNil(master) && !_.isNil(disciple) && master != disciple) {
      const d = await loadShitei(disciple, version);
      d.master_refid = master;
      await storeShitei(disciple, d);
    }
  }

  for (const sent of node.elements("bingo_card")) {
    const card_type = Number(sent.attr().card_type), query = { collection: "bingo_card" as const, version, card_type, state: "active" as const };
    const card = await DB.FindOne<bingo_card>(refid, query);
    if (_.isNil(card)) continue;
    // only the card this server gave: a card replaced since login is not written over
    const cells = sent.elements("mass_data").slice(0, card.mass.length);
    const same = cells.length == card.mass.length && cells.every((c, i) => {
      const a = c.attr(), m = card.mass[i];
      return Number(a.music_id) == m.music_id && Number(a.play_style) == m.play_style && Number(a.note_detail) == m.note_detail && Number(a.clear_type) == m.clear_type;
    });
    if (!same) continue;
    card.mass.forEach((m, i) => (m.is_clear = m.is_clear || cells[i].bool("is_clear")));
    const done = card.mass.every((m) => m.is_clear);
    await DB.Update<bingo_card>(refid, query, { $set: { mass: card.mass, ...(done && { state: "cleared" as const }) } });
    if (done) await CardCompleted(refid, version, card);
  }
}
