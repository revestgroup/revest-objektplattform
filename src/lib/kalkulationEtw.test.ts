/**
 * Prüfwerte aus `docs/planung/KALKULATION_ETW.md`, Abschnitt 3. Die Plattform muss mit
 * diesen Eingaben exakt diese Werte liefern — gerundet wie in der Excel-
 * Anzeige: Euro ganz, Prozent auf eine Stelle.
 */
import { describe, expect, test } from "bun:test";

import {
  AUFWERTUNGSKATALOG,
  STANDARD_VORGABEN,
  berechneEtw,
  katalogSumme,
  type EtwEingabe,
} from "./kalkulationEtw";

const PRUEFFALL: EtwEingabe = {
  kaufpreis: 185_000,
  wohnflaeche: 55,
  grestProzent: 5,
  notarProzent: 2,
  maklerAnkaufProzent: 0,
  aufwertung: 29_000,
  monate: 4,
  bewirtschaftungMonat: 100,
  finanzierungsbetrag: 185_000,
  zinsBankProzent: 5.5,
  gebuehrBankProzent: 1.5,
  coKapital: 0,
  zinsCoProzent: 8,
  maklerVerkaufProzent: 0,
  homeStaging: 0,
  // Wohnung allein; mit 30.000 Stellplatz ergibt das die 249/285/299 Tsd. der Vorlage.
  verkauf: { worst: 219_000, mid: 255_000, best: 269_000 },
  stellplatz: { worst: 30_000, mid: 30_000, best: 30_000 },
};

const euro = (v: number | null) => Math.round(v ?? NaN);
const prozent = (v: number | null) => Math.round((v ?? NaN) * 10) / 10;

describe("ETW-Kalkulation: Prüfwerte der Excel-Vorlage", () => {
  const e = berechneEtw(PRUEFFALL);

  test("Ankaufsnebenkosten und Finanzierung", () => {
    expect(euro(e.ankaufsnebenkosten)).toBe(12_950);
    expect(euro(e.finanzierungskosten)).toBe(6_167);
  });

  test.each([
    ["worst", 233_517, 15_483, 6.6, 3_982],
    ["mid", 233_517, 51_483, 22.0, 4_636],
    ["best", 233_517, 65_483, 28.0, 4_891],
  ] as const)("%s", (s, gesamt, gewinn, pz, qm) => {
    const z = e.szenarien[s];
    expect(euro(z.gesamtinvestition)).toBe(gesamt);
    expect(euro(z.gewinn)).toBe(gewinn);
    expect(prozent(z.gewinnProzent)).toBe(pz);
    expect(euro(z.preisJeQm)).toBe(qm);
  });

  test("Stellplatz zählt zum Gesamtverkaufspreis, nicht zum €/m²", () => {
    expect(e.szenarien.worst.gesamtverkaufspreis).toBe(249_000);
    expect(e.szenarien.best.gesamtverkaufspreis).toBe(299_000);
    const ohne = berechneEtw({ ...PRUEFFALL, stellplatz: { worst: 0, mid: 0, best: 0 } });
    expect(ohne.szenarien.worst.gewinn! + 30_000).toBeCloseTo(e.szenarien.worst.gewinn!, 6);
    expect(ohne.szenarien.worst.preisJeQm).toBe(e.szenarien.worst.preisJeQm);
  });
});

describe("Aufwertungskatalog", () => {
  test("alle Gewerke aus der Vorgabe, Garagentore unter Sonstiges", () => {
    expect(AUFWERTUNGSKATALOG).toHaveLength(16);
    expect(AUFWERTUNGSKATALOG.reduce((n, g) => n + g.positionen.length, 0)).toBe(102);
    const sonstiges = AUFWERTUNGSKATALOG.find((g) => g.titel === "Sonstiges");
    expect(sonstiges?.positionen.some((p) => p.titel === "Garagentore")).toBe(true);
  });

  test("drei Rechenarten", () => {
    const s = katalogSumme(
      // Architekt (pauschal 5.000), Laminat (50 €/m² × Fläche), 3 Innentüren à 400
      {
        katalog: { architekt: 1, laminat_inkl_trittschall_sockelleisten: 1, wohnungsinnentuere: 3 },
      },
      STANDARD_VORGABEN,
      55,
    );
    expect(s.jeGewerk.projektplanung).toBe(5_000);
    expect(s.jeGewerk.boden_innentueren).toBe(55 * 50 + 3 * 400);
    expect(s.gesamt).toBe(5_000 + 2_750 + 1_200);
  });

  test("Preis je Objekt schlägt Einstellung schlägt Katalog", () => {
    const vorgaben = { ...STANDARD_VORGABEN, preise: { architekt: 4_000 } };
    expect(katalogSumme({ katalog: { architekt: 1 } }, vorgaben, 55).gesamt).toBe(4_000);
    expect(
      katalogSumme({ katalog: { architekt: 1 }, preise: { architekt: 3_000 } }, vorgaben, 55)
        .gesamt,
    ).toBe(3_000);
  });
});
