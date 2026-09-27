import { bingo_card, bingo_mass, shitei } from "../models/shitei";
import { score } from "../models/score";
import { IDtoRef, JstWeek, Random } from "../util";
import { PlayableSongs } from "./musiclist";

// Master and disciple (師弟) bingo (IIDX 33, bm2dx 2026081900). pc.get <shitei> gives the player's
// cards: card_type 0 is the MASTERS BINGO CARD (folder 0xc6), 1 the MY BINGO CARD (0xc7), 9, 16 or 25
// cells {music_id, play_style, note_detail, clear_type (the lamp asked for), is_clear}. The client
// does the rest: a result at that lamp or higher clears the cell, and it pays DELLAR for new lines
// and the whole card (deller@ in pc.save). pc.save <shitei> carries the cards back with is_clear,
// and in the 1P save the master and disciple two players paired at the mode select (IIDX ids).
// The client has no rule for the cards: this server makes a MY card (3x3) each week (JST, from
// Wednesday) and, for a player with a master, a MASTERS card (4x4), from the imported song list at
// the level the player clears, preferring charts not yet cleared at that lamp. A completed card is
// replaced at the next login; a MASTERS card completed pays the master too.

const SIZE = [16, 9]; // by card_type
const MASTER_REWARD: Record<number, number> = { 9: 200, 16: 300, 25: 400 }; // DELLAR, as the client pays for a whole card

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h;
};

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

  // the level 80% of the charts the player cleared are at or under (6 without any)
  const cleared = [];
  for (const [id, , , levels] of songs)
    for (let d = 0; d < 5; d++) if (levels[style * 5 + d] > 0 && (lamps.get(id)?.[style * 5 + d] ?? 0) >= 4) cleared.push(levels[style * 5 + d]);
  cleared.sort((a, b) => a - b);
  const level = cleared.length ? cleared[Math.min(cleared.length - 1, Math.floor(cleared.length * 0.8))] : 6;

  const random = Random(hash(refid) ^ Math.imul(week, 31) ^ Math.imul(card_type + 1, 7919) ^ Math.imul(seq, 131));
  const size = SIZE[card_type], top = card_type == 1 ? level : Math.min(12, level + 1);
  const charts: bingo_mass[] = [];
  for (const [id, , , levels] of songs)
    for (let d = 0; d < 4; d++) { // BEGINNER .. ANOTHER
      const lv = levels[style * 5 + d];
      if (lv >= level - 1 && lv <= top)
        charts.push({ music_id: id, play_style: style, note_detail: d, clear_type: random() < (card_type == 1 ? 0.75 : 0.6) ? 4 : 5, is_clear: false });
    }
  for (let i = charts.length - 1; i > 0; i--) { // shuffle
    const j = Math.floor(random() * (i + 1));
    [charts[i], charts[j]] = [charts[j], charts[i]];
  }
  // charts not yet cleared at their lamp first, one per song (a song played again in a credit does not count)
  const open = (c: bingo_mass) => (lamps.get(c.music_id)?.[c.play_style * 5 + c.note_detail] ?? 0) < c.clear_type;
  const mass: bingo_mass[] = [];
  for (const c of [...charts.filter(open), ...charts.filter((c) => !open(c))])
    if (mass.length < size && !mass.some((m) => m.music_id == c.music_id)) mass.push(c);
  if (mass.length < size) return null;
  return { collection: "bingo_card", version, card_type, week, seq, state: "active", author_refid: author, mass };
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
