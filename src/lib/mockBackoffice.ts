/**
 * Beispielkarten fürs Backoffice. Erfunden wie alle Mock-Daten.
 */
import type { Backofficekarte } from "./backoffice";

const leer = {
  datei: null,
  objektId: null,
  gesellschaft: null,
  faelligAm: null,
  notizen: null,
  checkliste: [],
  zugewiesen: null,
  uebergabe: null,
} satisfies Partial<Backofficekarte>;

export const MOCK_BACKOFFICE: Backofficekarte[] = [
  {
    ...leer,
    id: "bo-1",
    titel: "Rechnung Elektro Kessler — Strangsanierung Abschlag 2",
    spalte: "posteingang",
    art: "rechnung",
    quelle: "scan",
    eingangAm: "2026-11-06T08:12:00.000Z",
    datei: {
      name: "2026-11-05_Rechnung_Kessler_Abschlag2.pdf",
      typ: "application/pdf",
      groesseKb: 184,
    },
    objektId: "obj-001",
    gesellschaft: "Revest Projekt",
    faelligAm: "2026-11-19",
    verlauf: [{ zeitpunkt: "2026-11-06T08:12:00.000Z", text: "Scan aus 00_Posteingang" }],
  },
  {
    ...leer,
    id: "bo-2",
    titel: "Finanzamt — Umsatzsteuer-Vorauszahlung Q3",
    spalte: "posteingang",
    art: "behoerde",
    quelle: "scan",
    eingangAm: "2026-11-05T09:40:00.000Z",
    datei: { name: "Finanzamt_Bescheid_Q3.pdf", typ: "application/pdf", groesseKb: 96 },
    gesellschaft: "Revest Projekt",
    faelligAm: "2026-11-10",
    verlauf: [{ zeitpunkt: "2026-11-05T09:40:00.000Z", text: "Scan aus 00_Posteingang" }],
  },
  {
    ...leer,
    id: "bo-3",
    titel: "Versicherung Fährgasse — neue Police prüfen",
    spalte: "besprechung",
    art: "vertrag",
    quelle: "mail",
    eingangAm: "2026-11-03T14:05:00.000Z",
    objektId: "obj-001",
    notizen: "Deckungssumme höher als bisher, Beitrag +12 %. Mit Steuerberater besprechen?",
    checkliste: [
      { id: "c1", text: "Alte Police kündigen", erledigt: false },
      { id: "c2", text: "Beitrag mit Kalkulation abgleichen", erledigt: true },
    ],
    verlauf: [{ zeitpunkt: "2026-11-03T14:05:00.000Z", text: "Mail an info@" }],
  },
  {
    ...leer,
    id: "bo-4",
    titel: "Handelsregisterauszug Revest Asset anfordern",
    spalte: "in_arbeit",
    art: "todo",
    quelle: "hand",
    eingangAm: "2026-11-02T10:00:00.000Z",
    gesellschaft: "Revest Asset",
    zugewiesen: "Timo Birk",
    verlauf: [{ zeitpunkt: "2026-11-02T10:00:00.000Z", text: "Karte angelegt" }],
  },
];
