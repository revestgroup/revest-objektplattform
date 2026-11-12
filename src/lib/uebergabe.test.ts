import { describe, expect, test } from "bun:test";

import { MOCK_OBJEKTE } from "./mockDaten";
import type { Objekt, Zaehler } from "./objekte";
import { ausAnkaufUebernehmen, protokollVon, zaehlerFuer, zaehlerHinweis } from "./uebergabe";

const z = (teil: Partial<Zaehler>): Zaehler => ({
  id: "z1",
  art: "strom",
  nummer: "1ESY123",
  stand: "4711",
  datum: "2026-04-17",
  maloId: "DE000123",
  foto: { name: "strom.jpg" },
  richtung: "an",
  einheitId: null,
  ...teil,
});

const projekt = (teil: Partial<Objekt> = {}): Objekt => ({
  ...MOCK_OBJEKTE.find((o) => o.stufe === "angekauft")!,
  zaehler: [],
  uebergaben: [],
  ...teil,
});

describe("Übergabeprotokoll", () => {
  test("Verkauf: Zähler und Schlüssel aus dem Ankauf, nur Nummern — nicht doppelt", () => {
    const o = projekt({
      zaehler: [z({}), z({ id: "z2", art: "gas", nummer: "G-9", maloId: null })],
      uebergaben: [
        {
          ...protokollVon(projekt(), "an", null),
          schluessel: [{ id: "s1", art: "Wohnung", anzahl: 3, bemerkung: null }],
        },
      ],
    });
    const neu = ausAnkaufUebernehmen(o, "e1");
    const ab = neu.zaehler!.filter((x) => x.richtung === "ab");
    expect(ab.map((x) => [x.art, x.nummer, x.maloId, x.stand, x.foto])).toEqual([
      ["strom", "1ESY123", "DE000123", null, null],
      ["gas", "G-9", null, null, null],
    ]);
    expect(neu.uebergaben!.find((p) => p.richtung === "ab")!.schluessel.map((s) => s.art)).toEqual([
      "Wohnung",
    ]);
    const nochmal = ausAnkaufUebernehmen({ ...o, ...neu }, "e1");
    expect(nochmal.zaehler!.filter((x) => x.richtung === "ab")).toHaveLength(2);
  });

  test("Zähler erscheinen in der passenden Ab-/Ummeldung", () => {
    const o = projekt({
      zaehler: [
        z({ richtung: "ab", einheitId: "e1" }),
        z({ id: "w", art: "wasser_kalt", nummer: "W1" }),
      ],
    });
    expect(
      zaehlerFuer(o, { id: "u", art: "strom", richtung: "ab", einheitId: "e1", status: "offen" })
        ?.nummer,
    ).toBe("1ESY123");
    expect(
      zaehlerFuer(o, { id: "u", art: "wasser", richtung: "an", einheitId: null, status: "offen" })
        ?.nummer,
    ).toBe("W1");
    expect(
      zaehlerFuer(o, { id: "u", art: "versicherung", richtung: "an", status: "offen" }),
    ).toBeNull();
  });

  test("Plausibilität", () => {
    expect(zaehlerHinweis(z({ stand: "0" }))).toContain("Stand 0");
    expect(zaehlerHinweis(z({ nummer: null }))).toBe("Zählernummer fehlt");
    expect(zaehlerHinweis(z({ maloId: null }))).toContain("MaLo-ID");
    expect(zaehlerHinweis(z({ art: "gas", maloId: null }))).toBeNull();
  });
});
