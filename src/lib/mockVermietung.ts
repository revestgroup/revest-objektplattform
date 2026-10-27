/**
 * Mock-Mietgarantien für Phase 1.
 *
 * Absichtlich kein durchweg gesunder Bestand: eine Wohnung steht leer, eine
 * WG hat ein freies Zimmer, eine Garantie läuft im nächsten Monat aus, zwei
 * sind vorbei. Genau diese Fälle sind der Grund, warum es diese Seite gibt.
 *
 * Alle Garantien laufen sechs Monate — so verkauft Revest. Dass die Mieter
 * teils seit Jahren drin wohnen, ist kein Widerspruch: die Garantie beginnt
 * mit dem Verkauf an den Käufer, nicht mit dem Mietverhältnis.
 */
import { JETZT } from "./mockDaten";
import type { Mietgarantie, Zimmer } from "./vermietung";

function vorMonaten(anzahl: number): string {
  const d = new Date(JETZT);
  d.setMonth(d.getMonth() - anzahl);
  return d.toISOString();
}

function zimmer(praefix: string, zeilen: [qm: number, miete: number][]): Zimmer[] {
  return zeilen.map(([qm, miete], i) => ({
    id: `${praefix}-z${i + 1}`,
    bezeichnung: `Zimmer ${i + 1}`,
    flaeche: qm,
    miete,
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
    verkauftAm: vorMonaten(2),
    verkaufspreis: 289_000,
    beginn: vorMonaten(1),
    laufzeitMonate: 6,
    garantiemiete: 480,
    sollmiete: 480,
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
    // Leerstand und Ablauf in zwei Monaten — der teuerste Fall, steht oben.
    beginn: vorMonaten(4),
    laufzeitMonate: 6,
    garantiemiete: 600,
    // Leerstand: bis der Nachmieter einzieht, zahlt Revest die volle Garantie.
    sollmiete: 598,
    zimmer: [],
    notiz: "Vormieter zum 30.09. ausgezogen. Nachmieter hat den Vertrag, Rücklauf steht aus.",
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
    verkauftAm: vorMonaten(3),
    verkaufspreis: 498_000,
    beginn: vorMonaten(2),
    laufzeitMonate: 6,
    garantiemiete: 2_150,
    sollmiete: null,
    zimmer: zimmer("mg-003", [
      [14, 450],
      [16, 470],
      [13, 440],
      [15, 460],
      // Zimmer 5 steht frei — die WG trägt die Garantie trotzdem fast allein.
      [12, 430],
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
    verkauftAm: vorMonaten(6),
    verkaufspreis: 412_000,
    // Läuft im nächsten Monat aus — Anschlussvereinbarung steht an.
    beginn: vorMonaten(5),
    laufzeitMonate: 6,
    garantiemiete: 1_720,
    sollmiete: null,
    zimmer: zimmer("mg-004", [
      [15, 455],
      [14, 440],
      [17, 480],
      [13, 430],
    ]),
    notiz: "Verlängerung um 6 Monate angeboten. Käufer will erst die Abrechnung sehen.",
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
    verkauftAm: vorMonaten(11),
    verkaufspreis: 268_000,
    beginn: vorMonaten(10),
    laufzeitMonate: 6,
    garantiemiete: 520,
    sollmiete: 520,
    zimmer: [],
    notiz: "Garantie ausgelaufen, Käufer verwaltet selbst weiter. Mieter unverändert.",
  },
  {
    id: "mg-006",
    objektId: null,
    einheitId: null,
    adresse: "Wagnerstraße 7, 89231 Neu-Ulm",
    einheitTitel: "WE 2 · 1. OG links",
    art: "wohnung",
    kaeufer: "T. Lindenmaier",
    kaeuferKontakt: "t.lindenmaier@gmx.net",
    verkauftAm: vorMonaten(22),
    verkaufspreis: 241_000,
    beginn: vorMonaten(21),
    laufzeitMonate: 6,
    garantiemiete: 465,
    sollmiete: 465,
    zimmer: [],
    notiz: "Mieterin zum Ende der Garantie ausgezogen. Käufer hat selbst nachvermietet.",
  },
];
