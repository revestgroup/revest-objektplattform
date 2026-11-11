/**
 * Mail & Aktivitäten am Objekt (SAMMLUNG 7): eine Zeitleiste mit allem, was
 * passiert ist — Mails, Telefonate, Notizen, Termine und was die Plattform
 * selbst vermerkt. Neueste oben, nach Monaten gruppiert.
 *
 * Phase 1: Mails werden von Hand eingefügt, „Neue E-Mail“ öffnet einen
 * Gmail-Entwurf. Phase 2: Gmail und Kalender liefern Einträge mit `quelle`
 * und `externeId` — die Zeitleiste muss dafür nicht umgebaut werden.
 */
import { anforderungsMail } from "./pruefung";
import type { Objekt, Verlaufseintrag } from "./objekte";

export type Aktivitaetsfilter = "alle" | "mail" | "telefonat" | "notiz" | "system";

export const AKTIVITAETSFILTER: Record<Aktivitaetsfilter, string> = {
  alle: "Alle",
  mail: "Mails",
  telefonat: "Telefonate",
  notiz: "Notizen",
  system: "System",
};

/** Was die Plattform früher selbst als „Notiz“ geschrieben hat. */
const SYSTEMTEXT = /^(Objektdaten bearbeitet|Objekt angelegt)/;

/** Zu welchem Filter ein Eintrag gehört. Termine stehen bei den Notizen — beides schreibt man selbst. */
export function kategorieVon(e: Verlaufseintrag): Exclude<Aktivitaetsfilter, "alle"> {
  if (e.art === "mail") return "mail";
  if (e.art === "telefonat") return "telefonat";
  if ((e.art === "notiz" || e.art === "termin") && e.vonHand !== false && !SYSTEMTEXT.test(e.text))
    return "notiz";
  return "system";
}

const MONAT = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });

export interface Monatsgruppe {
  schluessel: string;
  titel: string;
  eintraege: Verlaufseintrag[];
}

/** Neueste oben, je Monat ein Block. */
export function nachMonaten(
  eintraege: Verlaufseintrag[],
  filter: Aktivitaetsfilter = "alle",
): Monatsgruppe[] {
  const sortiert = eintraege
    .filter((e) => filter === "alle" || kategorieVon(e) === filter)
    .sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt));
  const gruppen: Monatsgruppe[] = [];
  for (const e of sortiert) {
    const d = new Date(e.zeitpunkt);
    const schluessel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let g = gruppen.at(-1);
    if (!g || g.schluessel !== schluessel) {
      g = { schluessel, titel: MONAT.format(d), eintraege: [] };
      gruppen.push(g);
    }
    g.eintraege.push(e);
  }
  return gruppen;
}

/* ------------------------------------------------------------------ */
/* Mails                                                                */
/* ------------------------------------------------------------------ */

/** Betreff mit Kürzel vorn — bleibt in Antworten erhalten, darüber ordnet Phase 2 zu. */
export function mitKuerzel(betreff: string, kuerzel: string | null): string {
  if (!kuerzel || betreff.includes(`[${kuerzel}]`)) return betreff;
  return `[${kuerzel}] ${betreff}`;
}

/** „Re: “ davor (nicht doppelt), Kürzel sichern. */
export function antwortBetreff(betreff: string | null, kuerzel: string | null): string {
  const b = (betreff ?? "").trim();
  const mitRe = /^(re|aw|antw):/i.test(b) ? b : `Re: ${b}`;
  return mitKuerzel(mitRe, kuerzel);
}

/** Steht ein anderes Kürzel im Betreff als das des Objekts? */
export function fremdesKuerzel(betreff: string | null, kuerzel: string | null): string | null {
  const gefunden = betreff?.match(/\[([A-Z]{2,5}\d{0,4}[A-Z]?)\]/)?.[1] ?? null;
  return gefunden && gefunden !== kuerzel ? gefunden : null;
}

export interface Mailvorlage {
  id: string;
  titel: string;
  betreff: (o: Objekt) => string;
  text: (o: Objekt, anrede: string, absender: string) => string;
}

const gruss = (absender: string) => `Viele Grüße\n${absender}\nRevest Projekt GmbH`;
const adresse = (o: Objekt) => `${o.strasse}, ${o.plz} ${o.stadt}`;

/** „Brandt & Partner, Herr Ostermann“ → „Guten Tag Herr Ostermann,“. */
export function anredeFuer(name: string | null | undefined): string {
  const teil = name?.split(",").pop()?.trim() ?? "";
  return /^(herr|frau)\b/i.test(teil) ? `Guten Tag ${teil},` : "Guten Tag,";
}

/**
 * Vorlagen für „Neue E-Mail“. Vorerst hier im Code, später in den
 * Einstellungen pflegbar — die Struktur bleibt dieselbe.
 */
export const MAILVORLAGEN: Mailvorlage[] = [
  {
    id: "frei",
    titel: "Frei",
    betreff: (o) => o.bezeichnung?.trim() || o.strasse,
    text: (_o, anrede, absender) => `${anrede}\n\n\n\n${gruss(absender)}`,
  },
  {
    id: "unterlagen",
    titel: "Unterlagen anfordern",
    betreff: (o) => `Unterlagen ${o.strasse}`,
    // Dieselbe Liste wie „Fehlende Unterlagen anfordern“ in der Checkliste.
    text: (o, _anrede, absender) => anforderungsMail(o, null, absender).text,
  },
  {
    id: "besichtigung",
    titel: "Besichtigungstermin",
    betreff: (o) => `Besichtigung ${o.strasse}`,
    text: (o, anrede, absender) =>
      `${anrede}\n\nwir würden uns das Objekt ${adresse(o)} gern ansehen. Passt Ihnen einer der folgenden Termine?\n\n- \n- \n\n${gruss(absender)}`,
  },
  {
    id: "angebot",
    titel: "Kaufpreisangebot",
    betreff: (o) => `Kaufpreisangebot ${o.strasse}`,
    text: (o, anrede, absender) =>
      `${anrede}\n\nnach Prüfung der Unterlagen bieten wir für das Objekt ${adresse(o)} einen Kaufpreis von  €.\n\nDas Angebot steht unter dem Vorbehalt der Finanzierung und gilt bis zum .\n\n${gruss(absender)}`,
  },
  {
    id: "absage",
    titel: "Absage",
    betreff: (o) => `${o.strasse}`,
    text: (o, anrede, absender) =>
      `${anrede}\n\nvielen Dank für das Angebot ${adresse(o)}. Nach Prüfung passt es leider nicht in unser Ankaufsprofil. Für weitere Angebote sind wir jederzeit offen.\n\n${gruss(absender)}`,
  },
];

/* ------------------------------------------------------------------ */
/* Telefonat und Termin                                                 */
/* ------------------------------------------------------------------ */

export const TERMINARTEN_AKTIVITAET = {
  besichtigung: "Besichtigung",
  notar: "Notartermin",
  uebergabe: "Übergabe",
  sonst: "Termin",
} as const;

/** Text für die Zeitleiste — die Details stehen in den Feldern daneben. */
export function telefonatText(t: { mit: string; ergebnis: string }): string {
  return `Telefonat mit ${t.mit || "?"}${t.ergebnis ? `: ${t.ergebnis}` : ""}`;
}

export function terminText(t: {
  art: string;
  datum: string;
  uhrzeit: string | null;
  ort: string | null;
}): string {
  const tag = t.datum.split("-").reverse().join(".");
  return `${t.art} am ${tag}${t.uhrzeit ? ` um ${t.uhrzeit}` : ""}${t.ort ? ` · ${t.ort}` : ""}`;
}
