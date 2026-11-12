import { describe, expect, test } from "bun:test";

import {
  durchlaufzeiten,
  erreichtAm,
  haengendeLeads,
  stufenwechsel,
  trichter,
  vorjahr,
  zeitraumFuer,
  zielImZeitraum,
} from "./auswertung";
import type { Angebotseingang } from "./eingang";
import { MOCK_OBJEKTE } from "./mockDaten";
import type { Objekt, Verlaufseintrag } from "./objekte";

const v = (zeitpunkt: string, teil: Partial<Verlaufseintrag>): Verlaufseintrag => ({
  id: zeitpunkt,
  zeitpunkt,
  art: "status",
  text: "",
  ...teil,
});

const objekt = (
  id: string,
  angelegtAm: string,
  verlauf: Verlaufseintrag[],
  stufe: Objekt["stufe"] = "angebot",
): Objekt => ({
  ...MOCK_OBJEKTE[0],
  id,
  angelegtAm,
  angekauftAm: null,
  stufe,
  verlauf,
});

describe("Auswertung: Stufenwechsel", () => {
  test("strukturiert, aus neuem und altem Text", () => {
    const o = objekt("a", "2026-01-05T00:00:00Z", [
      v("2026-02-01T00:00:00Z", { stufe: "besichtigt" }),
      v("2026-03-01T00:00:00Z", { text: "Stufe auf Angebot abgegeben gesetzt" }),
      v("2026-04-01T00:00:00Z", { text: "Stufe auf Verhandlung gesetzt · 1,6 Mio" }),
      v("2026-05-01T00:00:00Z", { text: "Angekauft — Beurkundung" }),
    ]);
    expect(stufenwechsel(o).map((w) => w.stufe)).toEqual([
      "neu",
      "besichtigt",
      "angebot",
      "angebot",
      "angekauft",
    ]);
  });

  test("übersprungene Stufe zählt mit", () => {
    const o = objekt("b", "2026-01-05T00:00:00Z", [
      v("2026-02-10T00:00:00Z", { stufe: "angebot" }),
    ]);
    expect(erreichtAm(o, "besichtigt")).toBe("2026-02-10T00:00:00Z");
    expect(erreichtAm(o, "angekauft")).toBeNull();
  });
});

describe("Auswertung: Zeitraum und Trichter", () => {
  test("Zeiträume und Vorjahr", () => {
    const heute = new Date("2026-11-12T10:00:00Z");
    expect(zeitraumFuer("woche", heute)).toEqual({ von: "2026-11-09", bis: "2026-11-15" });
    expect(zeitraumFuer("monat", heute)).toEqual({ von: "2026-11-01", bis: "2026-11-30" });
    expect(zeitraumFuer("quartal", heute)).toEqual({ von: "2026-10-01", bis: "2026-12-31" });
    expect(vorjahr({ von: "2028-02-01", bis: "2028-02-29" })).toEqual({
      von: "2027-02-01",
      bis: "2027-02-28",
    });
  });

  test("Trichter mit Quoten und Vorjahr, Grenzen eingeschlossen", () => {
    const objekte = [
      objekt("a", "2026-11-01T08:00:00Z", [
        v("2026-11-05T00:00:00Z", { stufe: "besichtigt" }),
        v("2026-11-30T20:00:00Z", { stufe: "angebot" }),
      ]),
      objekt("b", "2026-11-10T08:00:00Z", []),
      objekt("c", "2025-11-03T08:00:00Z", [v("2025-11-20T00:00:00Z", { stufe: "besichtigt" })]),
      objekt("d", "2026-10-31T23:00:00Z", []),
    ];
    const eingaenge = [
      { eingangAm: "2026-11-02T00:00:00Z" },
      { eingangAm: "2026-11-03T00:00:00Z" },
      { eingangAm: "2026-11-04T00:00:00Z" },
    ] as Angebotseingang[];
    const t = trichter(objekte, eingaenge, { von: "2026-11-01", bis: "2026-11-30" });
    expect(t.map((x) => x.anzahl)).toEqual([3, 2, 1, 1, 0]);
    expect(t[1].quote).toBeCloseTo(66.67, 1);
    expect(t[2].quote).toBe(50);
    expect(t.map((x) => x.vorjahr)).toEqual([0, 1, 1, 0, 0]);
  });

  test("Ziel je Woche/Monat/Jahr auf den Zeitraum umgerechnet", () => {
    const monat = { von: "2026-11-01", bis: "2026-11-30" };
    expect(zielImZeitraum(5, "woche", monat)).toBeCloseTo(21.43, 1);
    expect(zielImZeitraum(12, "jahr", monat)).toBeCloseTo(0.99, 2);
    expect(zielImZeitraum(10, "monat", { von: "2026-01-01", bis: "2026-12-31" })).toBeCloseTo(
      120,
      5,
    );
  });
});

describe("Auswertung: Durchlauf und hängende Leads", () => {
  const o = objekt("a", "2026-01-01T00:00:00Z", [
    v("2026-01-11T00:00:00Z", { stufe: "besichtigt" }),
    v("2026-01-31T00:00:00Z", { stufe: "angebot" }),
  ]);
  test("Ø Tage je Stufe", () => {
    const d = durchlaufzeiten([o]);
    expect(d[0]).toMatchObject({ tage: 10, anzahl: 1 });
    expect(d[1]).toMatchObject({ tage: 20 });
    expect(d[3]).toMatchObject({ tage: 30 });
    expect(d[2].tage).toBeNull();
  });
  test("hängend nach Schwelle, nur aktive", () => {
    const h = haengendeLeads(
      [o, { ...o, id: "x", stufe: "watchlist" }],
      21,
      new Date("2026-03-01T00:00:00Z"),
    );
    expect(h.map((x) => [x.objekt.id, x.seitTagen])).toEqual([["a", 29]]);
  });
});
