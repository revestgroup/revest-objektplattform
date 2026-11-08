/**
 * Ankauf-Eingang — alle Angebote an ankauf@ (Makler, ImmoMetrica), ca. 60 pro
 * Woche. Ziel ist eine interne Datenbank, wann welches Objekt zu welchem
 * Preis angeboten wurde, und ein Sichten in Sekunden: interessant oder
 * aussortiert.
 *
 * Stufe 1 (jetzt): Mailtext einfügen, die Erkennung füllt vor, Rest von Hand.
 * Stufe 2 (Phase 2): automatischer Import per n8n, Erkennung per Claude API.
 */
import type { Objekt, Objektart } from "./objekte";

export type Eingangsstatus = "offen" | "interessant" | "aussortiert";

export type Eingangsquelle = "makler" | "immometrica" | "portal" | "direkt" | "sonst";

export const EINGANGSQUELLEN: Record<Eingangsquelle, string> = {
  makler: "Makler-Mail",
  immometrica: "ImmoMetrica",
  portal: "Portal",
  direkt: "Direktangebot",
  sonst: "Sonstiges",
};

/** Schnellwahl beim Aussortieren — frei ergänzbar. */
export const AUSSORTIER_GRUENDE = [
  "zu teuer",
  "Lage",
  "Zustand",
  "Objektart",
  "zu klein",
  "zu groß",
  "Erbbaurecht",
];

export interface Angebotseingang {
  id: string;
  strasse: string;
  plz: string;
  stadt: string;
  stadtteil: string | null;
  preis: number | null;
  flaeche: number | null;
  zimmer: number | null;
  objektart: Objektart | null;
  /** Absender wie in der Mail; `kontaktId`, wenn er im Register steht. */
  absender: string | null;
  absenderEmail: string | null;
  kontaktId: string | null;
  eingangAm: string;
  quelle: Eingangsquelle;
  /** Nur in der Sitzung (blob:) — wie alle Dateien bis Phase 2. */
  expose: { name: string; vorschau?: string | null } | null;
  mailtext: string | null;
  status: Eingangsstatus;
  grund: string | null;
  /** Das Objekt, das aus dem Angebot wurde oder an dem es wiedererkannt wurde. */
  objektId: string | null;
  gesichtetAm: string | null;
}

/* ------------------------------------------------------------------ */
/* Texterkennung                                                        */
/* ------------------------------------------------------------------ */

export interface Erkannt {
  strasse: string | null;
  plz: string | null;
  stadt: string | null;
  preis: number | null;
  flaeche: number | null;
  zimmer: number | null;
  objektart: Objektart | null;
  absender: string | null;
  absenderEmail: string | null;
  quelle: Eingangsquelle;
}

/** „385.000“, „385.000,00“, „1,2 Mio“ → Zahl. */
function betrag(roh: string): number | null {
  const mio = roh.match(/([\d.,]+)\s*Mio/i);
  if (mio) {
    const n = Number(mio[1].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : null;
  }
  const s = roh.replace(/[^\d.,]/g, "").replace(/[.,]-?$/, "");
  if (!s) return null;
  // Deutsch: Punkt = Tausender, Komma = Dezimal.
  const ohneDezimal = s.replace(/,\d{1,2}$/, "");
  const n = Number(ohneDezimal.replace(/[.,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const NR = String.raw`\s+(\d+\s?[a-zA-Z]?)\b`;
/**
 * Drei Schreibweisen, in dieser Reihenfolge versucht:
 *  „Söflinger Str. 112“ (Beiwort + eigenes Wort), „Rebhangweg 9“ (ein Wort),
 *  „Am Ölberg 12“ (mit Vorwort). Mehr nicht — lieber leer als „Wohnung in der …“.
 */
const STRASSEN_MUSTER = [
  new RegExp(
    String.raw`\b([A-ZÄÖÜ][a-zäöüß-]+\s(?:Straße|Strasse|Str\.|Weg|Platz|Allee|Gasse|Ring|Steige))` +
      NR,
  ),
  new RegExp(
    String.raw`\b([A-ZÄÖÜ][a-zäöüß-]*(?:straße|strasse|str\.|weg|platz|allee|gasse|ring|steige|hof|damm|ufer|halde))` +
      NR,
  ),
  new RegExp(String.raw`\b((?:Am|An der|Im|Auf dem|Zum|Zur)\s[A-ZÄÖÜ][a-zäöüß-]+)` + NR),
];

function strasseFinden(t: string): string | null {
  for (const m of STRASSEN_MUSTER) {
    const treffer = t.match(m);
    if (treffer) return `${treffer[1]} ${treffer[2]}`.replace(/\s+/g, " ").trim();
  }
  return null;
}

/**
 * Was sich aus einer Angebotsmail sicher lesen lässt. Lieber leer als falsch:
 * ein leeres Feld fällt beim Sichten auf, ein falsch gelesenes nicht.
 */
export function textAuslesen(text: string): Erkannt {
  const t = text.replace(/\r/g, "");

  const strasse = strasseFinden(t);
  const ort = t.match(/\b(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+(?:[ -][A-ZÄÖÜ][a-zäöüß]+)?)/);

  const preisZeile =
    t.match(
      /(?:Kaufpreis|Preis|Angebotspreis|Verkaufspreis)\s*[:=]?\s*(?:EUR|€)?\s*([\d.,]+(?:\s*Mio)?)/i,
    ) ??
    t.match(/(?:€|EUR)\s*([\d.]{5,}(?:,\d{2})?)/) ??
    t.match(/([\d.]{5,}(?:,\d{2}|,-)?)\s*(?:€|EUR|Euro)/);
  const flaeche =
    t.match(
      /(?:Wohnfläche|Wfl\.?|Fläche)\s*(?:ca\.?|rd\.?)?\s*[:=]?\s*(?:ca\.?)?\s*([\d.,]+)\s*(?:m²|m2|qm)/i,
    ) ??
    // Hinter „²“ gibt es keine Wortgrenze — daher ein Blick nach vorn statt \b.
    t.match(/([\d.,]+)\s*(?:m²|m2|qm)(?![a-z])/i);
  const zimmer = t.match(/([\d,]+(?:[.,]5)?)\s*[- ]?(?:Zimmer|Zi\.)/i);

  const klein = t.toLowerCase();
  const objektart: Objektart | null = /mehrfamilienhaus|\bmfh\b|zinshaus|renditeobjekt/.test(klein)
    ? "mfh"
    : /wohn-?\s*(?:und|&)\s*geschäftshaus|wohn- und geschäfts/.test(klein)
      ? "whg_geschaeftshaus"
      : /grundstück|baugrund/.test(klein)
        ? "grundstueck"
        : /eigentumswohnung|\betw\b|wohnung|apartment/.test(klein)
          ? "etw"
          : null;

  const email = t.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0] ?? null;
  const von =
    t
      .match(/^(?:Von|From)\s*:\s*(.+?)(?:\s*<[^>]+>)?\s*$/im)?.[1]
      ?.replace(/["']/g, "")
      .trim() ?? null;

  return {
    strasse,
    plz: ort?.[1] ?? null,
    stadt: ort?.[2] ?? null,
    preis: preisZeile ? betrag(preisZeile[1]) : null,
    flaeche: flaeche ? Number(flaeche[1].replace(/\./g, "").replace(",", ".")) || null : null,
    zimmer: zimmer ? Number(zimmer[1].replace(",", ".")) || null : null,
    objektart,
    absender: von,
    absenderEmail: email,
    quelle: /immometrica/.test(klein) ? "immometrica" : email || von ? "makler" : "sonst",
  };
}

/* ------------------------------------------------------------------ */
/* Wiedererkennung                                                      */
/* ------------------------------------------------------------------ */

/** „Ravensburger Str. 134a“ und „ravensburger straße 134 A“ sind dieselbe Adresse. */
export function adresseNormalisieren(strasse: string): string {
  return strasse
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/str\.(?=\s|\d|$)/g, "strasse")
    .replace(/[^a-z0-9]/g, "");
}

export interface Bekannt {
  /** Seit wann die Adresse bekannt ist. */
  seit: string;
  /** Der damals genannte Preis, falls einer da ist. */
  damals: number | null;
  objekt: Objekt | null;
}

/**
 * Gab es die Adresse schon — als Objekt oder als früheres Angebot? Das
 * Objekt gewinnt; Datum und Preis kommen vom frühesten Eintrag.
 */
export function wiedererkennen(
  e: Pick<Angebotseingang, "id" | "strasse">,
  objekte: Objekt[],
  eingaenge: Angebotseingang[],
): Bekannt | null {
  const schluessel = adresseNormalisieren(e.strasse);
  if (schluessel.length < 4) return null;
  const objekt = objekte.find((o) => adresseNormalisieren(o.strasse) === schluessel) ?? null;
  const frueher = eingaenge
    .filter((x) => x.id !== e.id && adresseNormalisieren(x.strasse) === schluessel)
    .sort((a, b) => a.eingangAm.localeCompare(b.eingangAm));

  const kandidaten: { seit: string; damals: number | null }[] = [];
  if (objekt) {
    const erste = [...objekt.angebote].sort((a, b) => a.datum.localeCompare(b.datum))[0];
    kandidaten.push({
      seit: erste?.datum ?? objekt.angelegtAm,
      damals: erste?.preis ?? objekt.kaufpreis,
    });
  }
  if (frueher[0]) kandidaten.push({ seit: frueher[0].eingangAm, damals: frueher[0].preis });
  if (kandidaten.length === 0) return null;
  const aeltester = kandidaten.sort((a, b) => a.seit.localeCompare(b.seit))[0];
  return { ...aeltester, objekt };
}

/* ------------------------------------------------------------------ */
/* Suchprofil                                                           */
/* ------------------------------------------------------------------ */

export interface Suchprofil {
  staedte: string[];
  /** Leer heißt: alle Stadtteile der gewählten Städte. */
  stadtteile: string[];
  objektarten: Objektart[];
  maxPreisJeQm: number | null;
  preisVon: number | null;
  preisBis: number | null;
}

export const STANDARD_SUCHPROFIL: Suchprofil = {
  staedte: ["Ulm", "Neu-Ulm"],
  stadtteile: [],
  objektarten: ["etw", "mfh", "whg_geschaeftshaus"],
  maxPreisJeQm: 4_000,
  preisVon: null,
  preisBis: 3_000_000,
};

/** Warum ein Angebot nicht ins Profil passt — leer heißt: passt. */
export function profilAbweichungen(e: Angebotseingang, p: Suchprofil): string[] {
  const g: string[] = [];
  if (e.stadt && p.staedte.length && !p.staedte.includes(e.stadt)) g.push(`Ort ${e.stadt}`);
  if (e.stadtteil && p.stadtteile.length && !p.stadtteile.includes(e.stadtteil))
    g.push(`Stadtteil ${e.stadtteil}`);
  if (e.objektart && p.objektarten.length && !p.objektarten.includes(e.objektart))
    g.push("Objektart");
  if (e.preis !== null) {
    if (p.preisVon !== null && e.preis < p.preisVon) g.push("Preis unter Spanne");
    if (p.preisBis !== null && e.preis > p.preisBis) g.push("Preis über Spanne");
    if (p.maxPreisJeQm !== null && e.flaeche) {
      const qm = e.preis / e.flaeche;
      if (qm > p.maxPreisJeQm) g.push(`${Math.round(qm).toLocaleString("de-DE")} €/m² über Profil`);
    }
  }
  return g;
}

/**
 * Reihenfolge zum Sichten: erst was ins Profil passt, dann der Rest; darin
 * das Neueste zuerst.
 */
export function sortiereEingang(liste: Angebotseingang[], p: Suchprofil): Angebotseingang[] {
  return [...liste].sort((a, b) => {
    const pa = profilAbweichungen(a, p).length > 0 ? 1 : 0;
    const pb = profilAbweichungen(b, p).length > 0 ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return b.eingangAm.localeCompare(a.eingangAm);
  });
}
