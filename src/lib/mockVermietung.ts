/**
 * Mock-Mietgarantien für Phase 1.
 *
 * Absichtlich kein durchweg gesunder Bestand: eine Wohnung steht leer, eine
 * WG hat ein freies Zimmer, eine Garantie läuft in zwei Monaten aus. Genau
 * diese drei Fälle sind der Grund, warum es diese Seite gibt.
 */
import { JETZT } from "./mockDaten";
import type { Mietgarantie, Zimmer } from "./vermietung";

function vorMonaten(anzahl: number): string {
  const d = new Date(JETZT);
  d.setMonth(d.getMonth() - anzahl);
  return d.toISOString();
}

function zimmer(
  praefix: string,
  zeilen: [qm: number, miete: number, mieter: string | null, seitMonaten: number | null][],
): Zimmer[] {
  return zeilen.map(([qm, miete, mieter, seit], i) => ({
    id: `${praefix}-z${i + 1}`,
    bezeichnung: `Zimmer ${i + 1}`,
    flaeche: qm,
    miete,
    mieter,
    einzugAm: seit === null ? null : vorMonaten(seit),
  }));
}

export const MOCK_GARANTIEN: Mietgarantie[] = [
  {
    id: "mg-001",
    objektId: "obj-001",
    einheitId: "e001-1",
    adresse: "Brückenstraße 2, 89231 Neu-Ulm",
    einheitTitel: "WE 1 · EG links",
    art: "wohnung",
    kaeufer: "M. Scheible",
    kaeuferKontakt: "m.scheible@gmx.de",
    verkauftAm: vorMonaten(9),
    verkaufspreis: 289_000,
    beginn: vorMonaten(8),
    laufzeitMonate: 36,
    garantiemiete: 480,
    mieter: "L. Brandner",
    istMiete: 462,
    zimmer: [],
    notiz: "Mietvertrag läuft unbefristet. 18 € Unterdeckung aus der Staffel vor dem Ankauf.",
  },
  {
    id: "mg-002",
    objektId: "obj-001",
    einheitId: "e001-2",
    adresse: "Brückenstraße 2, 89231 Neu-Ulm",
    einheitTitel: "WE 2 · EG rechts",
    art: "wohnung",
    kaeufer: "Fam. Özdemir",
    kaeuferKontakt: "oezdemir.family@web.de",
    verkauftAm: vorMonaten(5),
    verkaufspreis: 362_000,
    beginn: vorMonaten(4),
    laufzeitMonate: 36,
    garantiemiete: 600,
    // Leerstand: Revest zahlt die volle Garantie aus eigener Tasche.
    mieter: null,
    istMiete: 598,
    zimmer: [],
    notiz: "Vormieter zum 30.09. ausgezogen. Zwei Besichtigungen gelaufen, Zusage steht aus.",
  },
  {
    id: "mg-003",
    objektId: null,
    einheitId: null,
    adresse: "Zinglerstraße 44, 89073 Ulm",
    einheitTitel: "WE 3 · 2. OG — 5er-WG",
    art: "wg",
    kaeufer: "Dr. A. Haller",
    kaeuferKontakt: "a.haller@haller-steuer.de",
    verkauftAm: vorMonaten(14),
    verkaufspreis: 498_000,
    beginn: vorMonaten(13),
    laufzeitMonate: 60,
    garantiemiete: 2_150,
    mieter: null,
    istMiete: null,
    zimmer: zimmer("mg-003", [
      [14, 450, "J. Keller", 12],
      [16, 470, "S. Aydin", 12],
      [13, 440, "N. Brecht", 7],
      [15, 460, "P. Kuhn", 3],
      // Ein freies Zimmer — die WG trägt die Garantie trotzdem fast allein.
      [12, 430, null, null],
    ]),
    notiz: "Zimmer 5 seit dem Auszug im August frei. Anfrage über die Leadseite liegt vor.",
  },
  {
    id: "mg-004",
    objektId: null,
    einheitId: null,
    adresse: "Söflinger Straße 12, 89077 Ulm",
    einheitTitel: "WE 1 · EG — 4er-WG",
    art: "wg",
    kaeufer: "S. Brugger",
    kaeuferKontakt: "0731 2098443",
    verkauftAm: vorMonaten(36),
    verkaufspreis: 412_000,
    beginn: vorMonaten(34),
    // Läuft in zwei Monaten aus — Anschlussvereinbarung steht an.
    laufzeitMonate: 36,
    garantiemiete: 1_720,
    mieter: null,
    istMiete: null,
    zimmer: zimmer("mg-004", [
      [15, 455, "F. Oswald", 20],
      [14, 440, "M. Treiber", 16],
      [17, 480, "L. Sayed", 9],
      [13, 430, "C. Wetzel", 4],
    ]),
    notiz: "Verlängerung um 24 Monate angeboten. Käufer will erst die Abrechnung sehen.",
  },
  {
    id: "mg-005",
    objektId: null,
    einheitId: null,
    adresse: "Römerstraße 9, 89077 Ulm",
    einheitTitel: "WE 4 · 1. OG rechts",
    art: "wohnung",
    kaeufer: "H. Vogler",
    kaeuferKontakt: "h.vogler@t-online.de",
    verkauftAm: vorMonaten(42),
    verkaufspreis: 268_000,
    beginn: vorMonaten(40),
    laufzeitMonate: 36,
    garantiemiete: 520,
    mieter: "K. Riedel",
    istMiete: 545,
    zimmer: [],
    notiz: "Garantie ausgelaufen, Käufer verwaltet selbst weiter. Mieter unverändert.",
  },
];
