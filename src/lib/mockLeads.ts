/**
 * Mock-Leads für Phase 1.
 *
 * Gemischt aus beiden Richtungen und beiden Herkünften, damit die Filter auf
 * der Seite etwas zu filtern haben. Die Nachrichten sind so formuliert, wie
 * Leute sie tatsächlich in ein Formular tippen — knapp und unvollständig.
 */
import type { Lead } from "./leads";
import { JETZT } from "./mockDaten";

function vorStunden(anzahl: number): string {
  return new Date(JETZT.getTime() - anzahl * 3_600_000).toISOString();
}

export const MOCK_LEADS: Lead[] = [
  {
    id: "lead-001",
    name: "Kerstin Mauch",
    email: "k.mauch@posteo.de",
    telefon: "0731 4408221",
    richtung: "verkaeufer",
    quelle: "leadseite",
    status: "neu",
    interesse: "verkauf",
    budget: 740_000,
    nachricht:
      "Zweifamilienhaus in Ulm-Söflingen, Baujahr 1964, beide Wohnungen vermietet. Erbengemeinschaft, wir wollen zügig verkaufen.",
    objektId: null,
    notiz: null,
    eingegangenAm: vorStunden(5),
  },
  {
    id: "lead-002",
    name: "Dr. Jonas Renner",
    email: "jonas.renner@gmail.com",
    telefon: null,
    richtung: "kaeufer",
    quelle: "leadseite",
    status: "neu",
    interesse: "wg",
    budget: 450_000,
    nachricht:
      "Interesse am WG-Konzept. Wie hoch ist die Mietgarantie und über welche Laufzeit?",
    objektId: "obj-013",
    notiz: null,
    eingegangenAm: vorStunden(19),
  },
  {
    id: "lead-003",
    name: "Melanie Sautter",
    email: "m.sautter@sautter-dental.de",
    telefon: "0176 23449087",
    richtung: "kaeufer",
    quelle: "leadseite",
    status: "kontaktiert",
    interesse: "kapitalanlage",
    budget: 320_000,
    nachricht: "Suche eine vermietete Eigentumswohnung in Ulm oder Neu-Ulm, gern mit Garantie.",
    objektId: "obj-018",
    notiz: "Rückruf für Donnerstag vereinbart. Finanzierung über Sparkasse Ulm steht.",
    eingegangenAm: vorStunden(54),
  },
  {
    id: "lead-004",
    name: "Erwin Gaßner",
    email: null,
    telefon: "0731 719044",
    richtung: "verkaeufer",
    quelle: "telefon",
    status: "qualifiziert",
    interesse: "verkauf",
    budget: 1_250_000,
    nachricht: null,
    objektId: null,
    notiz:
      "Mehrfamilienhaus Neu-Ulm, 6 Einheiten, Baujahr 1971. Preisvorstellung zu hoch, Besichtigung trotzdem terminiert.",
    eingegangenAm: vorStunden(96),
  },
  {
    id: "lead-005",
    name: "Tobias Lechner",
    email: "t.lechner@lechner-it.de",
    telefon: "0170 8842310",
    richtung: "kaeufer",
    quelle: "empfehlung",
    status: "termin",
    interesse: "wg",
    budget: 520_000,
    nachricht: null,
    objektId: "obj-011",
    notiz: "Empfehlung von Dr. Haller. Termin am Freitag 14:00 im Büro, Traminerweg vorbereiten.",
    eingegangenAm: vorStunden(140),
  },
  {
    id: "lead-006",
    name: "Sabine Hornung",
    email: "sabine.hornung@outlook.de",
    telefon: "0731 3307712",
    richtung: "kaeufer",
    quelle: "leadseite",
    status: "deal",
    interesse: "kapitalanlage",
    budget: 380_000,
    nachricht: "Ich suche eine Kapitalanlage bis 400.000 € mit gesicherter Miete.",
    objektId: "obj-001",
    notiz: "Kauf WE 2 beurkundet. Mietgarantie über 36 Monate hinterlegt.",
    eingegangenAm: vorStunden(620),
  },
  {
    id: "lead-007",
    name: "Markus Pfeil",
    email: "pfeil.markus@gmx.net",
    telefon: null,
    richtung: "verkaeufer",
    quelle: "portal",
    status: "abgelehnt",
    interesse: "verkauf",
    budget: 690_000,
    nachricht: "Reihenmittelhaus Wiblingen, selbst bewohnt, Verkauf im nächsten Frühjahr.",
    objektId: null,
    notiz: "Eigennutzerobjekt ohne Aufteilungspotenzial — passt nicht ins Profil.",
    eingegangenAm: vorStunden(310),
  },
  {
    id: "lead-008",
    name: "Nadine Örtel",
    email: "n.oertel@kanzlei-oertel.de",
    telefon: "0731 9924408",
    richtung: "kaeufer",
    quelle: "leadseite",
    status: "neu",
    interesse: "wg",
    budget: 500_000,
    nachricht: "Anfrage zum freien Zimmer in der Zinglerstraße — ist die Einheit noch zu haben?",
    objektId: null,
    notiz: null,
    eingegangenAm: vorStunden(31),
  },
];
