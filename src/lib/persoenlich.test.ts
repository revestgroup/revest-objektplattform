import { describe, expect, test } from "bun:test";

import {
  fokusSerie,
  impulsFuer,
  schieben,
  startstand,
  verschieben,
  wochenstand,
  type Kachel,
} from "./persoenlich";

let n = 0;
const id = (p: string) => `${p}-${++n}`;

describe("Persönlich: Start", () => {
  test("leere Kacheln je Startkategorie, keine Beispielinhalte", () => {
    const s = startstand(id);
    expect(s.board.map((k) => k.kategorie)).toEqual([
      "Unternehmen",
      "Familie",
      "Gesundheit",
      "Finanzen",
      "Freiheit / Reisen",
      "Lernen",
    ]);
    expect(s.board.every((k) => k.satz === "" && k.bild === null)).toBe(true);
    expect(s.privateZiele).toEqual([]);
    expect(s.ideen).toEqual([]);
  });
});

describe("Persönlich: Heute zählt", () => {
  const heute = new Date(2026, 10, 12, 9);

  test("Serie zählt rückwärts, heute leer zählt ab gestern", () => {
    expect(fokusSerie({}, heute)).toBe(0);
    expect(
      fokusSerie(
        { "2026-11-12": "A", "2026-11-11": "B", "2026-11-10": "C", "2026-11-08": "D" },
        heute,
      ),
    ).toBe(3);
    expect(fokusSerie({ "2026-11-11": "B", "2026-11-10": "C" }, heute)).toBe(2);
    expect(fokusSerie({ "2026-11-12": "  " }, heute)).toBe(0);
  });

  test("Wochenstand: Termine, Zeitblöcke und Sprint-Punkte dieser Woche", () => {
    const tag = (d: number) => new Date(2026, 10, d).toISOString();
    const w = wochenstand(
      [
        { art: "termin", faelligAm: tag(10), erledigtAm: tag(10) },
        {
          art: "anruf",
          faelligAm: tag(11),
          erledigtAm: null,
          zeitblock: { von: "09:00", bis: "10:00" },
        },
        { art: "anruf", faelligAm: tag(11), erledigtAm: null }, // kein Sprint-Eintrag
        { art: "termin", faelligAm: tag(16), erledigtAm: null }, // nächste Woche
      ],
      [
        {
          id: "a",
          bereich: "X",
          titel: "vorbei",
          von: "2026-11-09T08:00",
          bis: "2026-11-09T09:00",
        },
        { id: "b", bereich: "X", titel: "kommt", von: "2026-11-13T08:00", bis: "2026-11-13T09:00" },
      ],
      heute,
    );
    expect(w).toEqual({ erledigt: 2, gesamt: 4 });
  });
});

describe("Persönlich: Impuls und Board", () => {
  const k = (id: string, satz = ""): Kachel => ({ id, kategorie: "X", satz, bild: null });

  test("Impuls nur aus gefüllten Kacheln, wechselt täglich, Versatz gilt nur heute", () => {
    const board = [k("a", "Eins"), k("leer"), k("b", "Zwei")];
    const heute = new Date(2026, 10, 12);
    const morgen = new Date(2026, 10, 13);
    const h = impulsFuer(board, { am: "", versatz: 0 }, heute)!;
    const m = impulsFuer(board, { am: "", versatz: 0 }, morgen)!;
    expect(h.id).not.toBe(m.id);
    expect(impulsFuer(board, { am: "2026-11-12", versatz: 1 }, heute)!.id).toBe(m.id);
    expect(impulsFuer(board, { am: "2026-11-11", versatz: 1 }, heute)!.id).toBe(h.id);
    expect(impulsFuer([k("leer")], { am: "", versatz: 0 }, heute)).toBeNull();
  });

  test("Ziehen und Schieben ändern nur die Reihenfolge", () => {
    const b = [k("a"), k("b"), k("c"), k("d")];
    expect(verschieben(b, "d", "a").map((x) => x.id)).toEqual(["d", "a", "b", "c"]);
    expect(verschieben(b, "a", "c").map((x) => x.id)).toEqual(["b", "c", "a", "d"]);
    expect(schieben(b, "b", -1).map((x) => x.id)).toEqual(["b", "a", "c", "d"]);
    expect(schieben(b, "d", 1)).toBe(b);
  });
});
