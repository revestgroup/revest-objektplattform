/**
 * Kontakte, die nur im Register stehen — Versorger, Handwerker, Bank. Die
 * übrigen entstehen beim Abgleich aus den Kontakten der Mock-Objekte.
 * Erfunden wie alle Mock-Daten.
 */
import type { Kontaktdatensatz } from "./kontakte";

const angelegt = "2026-03-01T09:00:00.000Z";

function k(
  teil: Partial<Kontaktdatensatz> & Pick<Kontaktdatensatz, "id" | "kategorien">,
): Kontaktdatensatz {
  return {
    name: "",
    firma: null,
    telefon: null,
    mobil: null,
    email: null,
    ort: "Ulm",
    status: "aktiv",
    quelle: "Netzwerk",
    notizen: [],
    letzterKontakt: null,
    angelegtAm: angelegt,
    ...teil,
  };
}

export const MOCK_KONTAKTE: Kontaktdatensatz[] = [
  k({
    id: "k-stadtwerke",
    firma: "Stadtwerke Donau",
    name: "Kundenservice",
    kategorien: ["Versorger"],
    telefon: "0731 0000101",
    email: "service@stadtwerke.beispiel.de",
    notizen: [
      {
        id: "kn-1",
        zeitpunkt: "2026-06-03T10:00:00.000Z",
        text: "Ummeldung Fährgasse 6: Gas und Strom gemeldet.",
      },
    ],
  }),
  k({
    id: "k-kessler",
    firma: "Elektro Kessler",
    name: "Herr Kessler",
    kategorien: ["Handwerker / Dienstleister"],
    telefon: "0731 0000102",
    mobil: "0170 0000103",
  }),
  k({
    id: "k-bank",
    firma: "Volksbank Beispiel",
    name: "Frau Lenz",
    kategorien: ["Bank"],
    telefon: "0731 0000104",
    email: "lenz@bank.beispiel.de",
    status: "aktiv",
  }),
  k({
    id: "k-investor",
    firma: "Albtal Family Office",
    name: "Herr Brenner",
    kategorien: ["Family Office", "Kaufinteressent"],
    telefon: "0711 0000105",
    ort: "Stuttgart",
    status: "todo",
    quelle: "Empfehlung",
  }),
  k({
    id: "k-versicherung",
    firma: "Gebäudeversicherung Süd",
    name: "",
    kategorien: ["Versicherung"],
    telefon: "0731 0000106",
  }),
];
