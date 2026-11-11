import { describe, expect, test } from "bun:test";

import { MOCK_OBJEKTE } from "./mockDaten";
import type { Objekt } from "./objekte";
import {
  abgeschlossen,
  aufteilen,
  mitAbgleich,
  mitPlatzhaltern,
  offeneKaeuferanteile,
  ohnePlatzhalter,
  type Nachberechnungszeile,
} from "./nachberechnung";

const zeile = (teil: Partial<Nachberechnungszeile> = {}): Nachberechnungszeile => ({
  id: "z",
  seite: "verkauf",
  einheitId: "e1",
  art: "grundsteuer",
  titel: null,
  betrag: 480,
  von: "2026-01-01",
  bis: "2026-12-31",
  beleg: null,
  status: "offen",
  manuellRevest: null,
  ...teil,
});

describe("Nachberechnung: taggenau", () => {
  test("Testwert: 480 €/Jahr, Stichtag 15.08. → Revest 297,21 €, Käufer 182,79 €", () => {
    const a = aufteilen(zeile(), "2026-08-15")!;
    expect(a).toEqual({ revest: 297.21, gegenseite: 182.79, tageRevest: 226, tageGesamt: 365 });
  });

  test("Ankauf umgekehrt: bis zum Stichtag der Verkäufer", () => {
    const a = aufteilen(zeile({ seite: "ankauf" }), "2026-08-15")!;
    expect(a.revest).toBe(182.79);
    expect(a.gegenseite).toBe(297.21);
  });

  test("Schaltjahr: 366 Tage", () => {
    const a = aufteilen(zeile({ von: "2028-01-01", bis: "2028-12-31" }), "2028-03-01")!;
    expect(a.tageGesamt).toBe(366);
    expect(a.tageRevest).toBe(60);
  });

  test("Zeitraum ganz vor bzw. ganz nach dem Stichtag", () => {
    expect(
      aufteilen(zeile({ von: "2026-01-01", bis: "2026-03-31" }), "2026-08-15")!.gegenseite,
    ).toBe(0);
    expect(aufteilen(zeile({ von: "2026-09-01", bis: "2026-12-31" }), "2026-08-15")!.revest).toBe(
      0,
    );
  });

  test("manuelle Aufteilung, ohne Betrag keine Aufteilung", () => {
    expect(aufteilen(zeile({ betrag: 1200, manuellRevest: 350 }), "2026-08-15")).toMatchObject({
      revest: 350,
      gegenseite: 850,
    });
    expect(aufteilen(zeile({ betrag: null }), "2026-08-15")).toBeNull();
  });
});

describe("Nachberechnung: Platzhalter und Abschluss", () => {
  const o: Objekt = {
    ...MOCK_OBJEKTE.find((x) => x.stufe === "angekauft")!,
    nachberechnung: [],
    ummeldungen: [],
  };
  const e = o.einheiten.find((x) => x.verkauftAm)!;

  test("Platzhalter beim Verkauf, nur einmal; Rücknahme räumt unberührte weg", () => {
    const mit = mitPlatzhaltern(o, e.id);
    expect(mit.nachberechnung!.map((z) => z.art)).toEqual([
      "grundsteuer",
      "hausgeldabrechnung",
      "versicherung",
      "versorger",
    ]);
    expect(mitPlatzhaltern(mit, e.id)).toBe(mit);
    expect(abgeschlossen(mit, e.id)).toBe(false);
    expect(ohnePlatzhalter(mit, e.id).nachberechnung).toHaveLength(0);
    const erledigt = {
      ...mit,
      nachberechnung: mit.nachberechnung!.map((z) => ({ ...z, status: "erledigt" as const })),
    };
    expect(abgeschlossen(erledigt, e.id)).toBe(true);
  });

  test("offene Käuferanteile summiert, bezahlte nicht", () => {
    const x = {
      ...o,
      einheiten: o.einheiten.map((y) =>
        y.id === e.id ? { ...y, verkauftAm: "2026-08-15", uebergabeAm: null } : y,
      ),
    };
    const a = {
      ...x,
      nachberechnung: [
        zeile({ einheitId: e.id }),
        zeile({ id: "b", einheitId: e.id, status: "bezahlt" }),
      ],
    };
    expect(offeneKaeuferanteile([a])).toEqual({ summe: 182.79, objekte: [a] });
  });

  test("alle Grundsteuer-Zeilen erledigt → „Grundsteuer anteilig“ bestätigt", () => {
    const a: Objekt = {
      ...o,
      ummeldungen: [
        { id: "u", art: "grundsteuer_anteilig", richtung: "ab", einheitId: e.id, status: "offen" },
      ],
      nachberechnung: [zeile({ einheitId: e.id, status: "erledigt" })],
    };
    expect(mitAbgleich(a, "2026-11-11").ummeldungen![0]).toMatchObject({
      status: "bestaetigt",
      bestaetigtAm: "2026-11-11",
    });
    const offen = { ...a, nachberechnung: [zeile({ einheitId: e.id })] };
    expect(mitAbgleich(offen)).toBe(offen);
  });
});
