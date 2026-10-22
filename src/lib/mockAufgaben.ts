/**
 * Beispielaufgaben.
 *
 * An echte Objekte gehängt, damit die Zuordnung auf der Seite sichtbar ist und
 * nicht nur behauptet wird. Eine Aufgabe ist überfällig, eine ohne Frist —
 * sonst sieht man nie, wie die Liste mit beidem umgeht.
 */
import type { Aufgabe } from "./aufgaben";
import { JETZT } from "./mockDaten";

function tage(n: number): string {
  return new Date(JETZT.getTime() + n * 86_400_000).toISOString();
}

export const MOCK_AUFGABEN: Aufgabe[] = [
  {
    id: "auf-001",
    titel: "Rückruf Verwalter Schäufele",
    beschreibung:
      "Forderung liegt 40.000 € über unserem Limit. Fragen, ob bei 405.000 € etwas geht — sonst absagen und Kontakt für später halten.",
    objektId: "obj-011",
    art: "anruf",
    dringlichkeit: "hoch",
    faelligAm: tage(-2),
    erledigtAm: null,
    angelegtAm: tage(-9),
  },
  {
    id: "auf-002",
    titel: "Teilungserklärung anfordern",
    beschreibung: "Fehlt noch im Ordner 02_recht. Ohne sie keine Aufteilung.",
    objektId: "obj-001",
    art: "unterlagen",
    dringlichkeit: "hoch",
    faelligAm: tage(0),
    erledigtAm: null,
    angelegtAm: tage(-4),
  },
  {
    id: "auf-003",
    titel: "Angebot Sanitär einholen",
    beschreibung: "Drei Bäder im Vorderhaus. Zwei Angebote reichen zum Vergleich.",
    objektId: "obj-001",
    art: "unterlagen",
    dringlichkeit: "normal",
    faelligAm: tage(3),
    erledigtAm: null,
    angelegtAm: tage(-2),
  },
  {
    id: "auf-004",
    titel: "Besichtigung Wagnerstraße",
    beschreibung: "Termin mit dem Makler abstimmen, am besten vormittags.",
    objektId: "obj-013",
    art: "besichtigung",
    dringlichkeit: "normal",
    faelligAm: tage(5),
    erledigtAm: null,
    angelegtAm: tage(-1),
  },
  {
    id: "auf-005",
    titel: "Verkaufsplanung durchrechnen",
    beschreibung: "WG-Variante gegen normale Vermietung stellen und entscheiden.",
    objektId: "obj-011",
    art: "rechnen",
    dringlichkeit: "normal",
    faelligAm: tage(9),
    erledigtAm: null,
    angelegtAm: tage(-3),
  },
  {
    id: "auf-006",
    titel: "Mietaufstellung prüfen",
    beschreibung: null,
    objektId: "obj-018",
    art: "rechnen",
    dringlichkeit: "niedrig",
    faelligAm: null,
    erledigtAm: null,
    angelegtAm: tage(-6),
  },
  {
    id: "auf-007",
    titel: "Zielfaktor für 2027 festlegen",
    beschreibung: "Gilt für alle neuen Ankäufe. Mit der Bank abstimmen.",
    objektId: null,
    art: "sonst",
    dringlichkeit: "niedrig",
    faelligAm: tage(24),
    erledigtAm: null,
    angelegtAm: tage(-11),
  },
  {
    id: "auf-008",
    titel: "Energieausweis anfordern",
    beschreibung: null,
    objektId: "obj-018",
    art: "unterlagen",
    dringlichkeit: "normal",
    faelligAm: tage(-5),
    erledigtAm: tage(-5),
    angelegtAm: tage(-12),
  },
  {
    id: "auf-009",
    titel: "Notartermin bestätigen",
    beschreibung: "Beurkundung Brückenstraße.",
    objektId: "obj-001",
    art: "termin",
    dringlichkeit: "hoch",
    faelligAm: tage(-20),
    erledigtAm: tage(-19),
    angelegtAm: tage(-26),
  },
];
