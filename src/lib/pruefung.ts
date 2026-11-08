/**
 * Objektprüfung im Ankauf: welche Unterlagen da sind und welche Punkte
 * geklärt sind. Daraus eine Ampel und eine Warnung, wenn ein Objekt ins
 * Angebot oder in den Kauf geht, bevor das Wesentliche geprüft ist.
 *
 * Die Warnung sperrt nicht — Timo entscheidet. Sie sorgt nur dafür, dass
 * niemand aus Versehen ein Angebot abgibt, ohne die Teilungserklärung gesehen
 * zu haben.
 */
import type { Ankaufsstufe, Dokument, Objekt } from "./objekte";

export type Unterlagenstatus = "fehlt" | "angefordert" | "liegt_vor";
export type Punktstatus = "offen" | "ok" | "kritisch";

export const UNTERLAGENSTATUS: Record<Unterlagenstatus, string> = {
  fehlt: "fehlt",
  angefordert: "angefordert",
  liegt_vor: "liegt vor",
};

export const PUNKTSTATUS: Record<Punktstatus, string> = {
  offen: "offen",
  ok: "ok",
  kritisch: "kritisch",
};

/** Gespeichert am Objekt. Fehlt ein Eintrag, gilt „fehlt“ bzw. „offen“. */
export interface Pruefung {
  unterlagen?: Record<string, { status: Unterlagenstatus; dokumentId?: string | null }>;
  punkte?: Record<string, { status: Punktstatus; notiz?: string | null }>;
}

export interface Pruefposten {
  id: string;
  titel: string;
  /** Pflicht heißt: offen oder kritisch löst beim Stufenwechsel die Warnung aus. */
  pflicht: boolean;
}

/** Bei Eigentumswohnungen — mit den Unterlagen der WEG. */
const UNTERLAGEN_ETW: Pruefposten[] = [
  { id: "grundbuch", titel: "Grundbuchauszug", pflicht: true },
  { id: "teilungserklaerung", titel: "Teilungserklärung", pflicht: true },
  { id: "aufteilungsplan", titel: "Aufteilungsplan", pflicht: false },
  { id: "weg_protokolle", titel: "WEG-Protokolle (3 Jahre)", pflicht: true },
  { id: "wirtschaftsplan", titel: "Wirtschaftsplan", pflicht: true },
  { id: "hausgeldabrechnung", titel: "Hausgeld-Jahresabrechnung", pflicht: true },
  { id: "ruecklagennachweis", titel: "Rücklagennachweis", pflicht: false },
  { id: "energieausweis", titel: "Energieausweis", pflicht: true },
  { id: "grundriss", titel: "Grundriss", pflicht: false },
  { id: "mietvertrag", titel: "Mietvertrag / Mieterliste", pflicht: false },
];

/** Bei Häusern gibt es keine WEG — dafür die Unterlagen der Vermietung. */
const UNTERLAGEN_HAUS: Pruefposten[] = [
  { id: "grundbuch", titel: "Grundbuchauszug", pflicht: true },
  { id: "mietaufstellung", titel: "Mietaufstellung", pflicht: true },
  { id: "nebenkostenabrechnung", titel: "Nebenkostenabrechnung", pflicht: false },
  { id: "bauplaene", titel: "Baupläne", pflicht: false },
  { id: "energieausweis", titel: "Energieausweis", pflicht: true },
  { id: "grundriss", titel: "Grundriss", pflicht: false },
  { id: "mietvertrag", titel: "Mietvertrag / Mieterliste", pflicht: false },
];

/** `nurWeg`: ergibt nur bei einer Eigentümergemeinschaft Sinn. */
const PRUEFPUNKTE: (Pruefposten & { nurWeg?: boolean })[] = [
  {
    id: "sonderumlagen",
    titel: "Sonderumlagen beschlossen oder geplant",
    pflicht: true,
    nurWeg: true,
  },
  { id: "erhaltungsruecklage", titel: "Höhe der Erhaltungsrücklage", pflicht: true, nurWeg: true },
  { id: "beschluesse", titel: "Anstehende Beschlüsse / Maßnahmen", pflicht: true },
  { id: "hausgeld", titel: "Hausgeld plausibel", pflicht: true, nurWeg: true },
  { id: "stellplatz", titel: "Stellplatz/TG mit eigenem Grundbuch", pflicht: true },
  { id: "mietverhaeltnis", titel: "Mietverhältnis und Kündigungsfristen", pflicht: true },
  { id: "denkmal_erbbau", titel: "Denkmalschutz / Erbbaurecht", pflicht: true },
  { id: "altlasten", titel: "Altlasten / Baulasten", pflicht: true },
];

export function istWeg(o: Objekt): boolean {
  return o.objektart === "etw";
}

export function unterlagenFuer(o: Objekt): Pruefposten[] {
  return istWeg(o) ? UNTERLAGEN_ETW : UNTERLAGEN_HAUS;
}

export function pruefpunkteFuer(o: Objekt): Pruefposten[] {
  return PRUEFPUNKTE.filter((p) => istWeg(o) || !p.nurWeg);
}

/**
 * Woran man eine Datei als Unterlage erkennt. Der Name wird vorher klein
 * geschrieben und von Umlauten befreit („Teilungserklärung“ → „teilungserklaerung“).
 */
const DATEIMUSTER: Record<string, RegExp> = {
  grundbuch: /grundbuch/,
  teilungserklaerung: /teilungserkl/,
  aufteilungsplan: /aufteilungsplan/,
  weg_protokolle: /weg.?protokoll|eigentuemerversammlung/,
  wirtschaftsplan: /wirtschaftsplan/,
  hausgeldabrechnung: /hausgeld/,
  ruecklagennachweis: /ruecklage/,
  energieausweis: /energieausweis/,
  grundriss: /grundriss/,
  mietvertrag: /mietvertrag|mieterliste|mietaufstellung/,
  mietaufstellung: /mietaufstellung|mieterliste/,
  nebenkostenabrechnung: /nebenkosten|betriebskosten/,
  bauplaene: /bauplan|bauplaene|bauzeichnung/,
};

function dateiname(n: string): string {
  return n.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/**
 * Die Datei zu einer Unterlage: von Hand zugeordnet, sonst die erste, deren
 * Name passt. Von Hand gesetzt schlägt immer die Automatik — auch „keine Datei“.
 */
export function zugeordneteDatei(o: Objekt, id: string): Dokument | null {
  const gesetzt = o.pruefung?.unterlagen?.[id];
  if (gesetzt && gesetzt.dokumentId !== undefined) {
    return o.dokumente.find((d) => d.id === gesetzt.dokumentId) ?? null;
  }
  const muster = DATEIMUSTER[id];
  return muster ? (o.dokumente.find((d) => muster.test(dateiname(d.name))) ?? null) : null;
}

/** Ohne eigenen Eintrag „liegt vor“, sobald eine passende Datei da ist. */
export function unterlagenstatus(o: Objekt, id: string): Unterlagenstatus {
  const gesetzt = o.pruefung?.unterlagen?.[id]?.status;
  if (gesetzt) return gesetzt;
  return zugeordneteDatei(o, id) ? "liegt_vor" : "fehlt";
}

/**
 * Denkmalschutz und Erbbaurecht stehen schon als Haken am Objekt. Sind beide
 * aus, ist der Punkt vorbelegt „ok“ — solange niemand ihn selbst setzt.
 */
export function punktstatus(o: Objekt, id: string): Punktstatus {
  const gesetzt = o.pruefung?.punkte?.[id]?.status;
  if (gesetzt) return gesetzt;
  if (id === "denkmal_erbbau" && !o.denkmalschutz && !o.erbbaurecht) return "ok";
  return "offen";
}

export type Ampel = "gruen" | "gelb" | "rot";

export interface Pruefstand {
  erledigt: number;
  gesamt: number;
  ampel: Ampel;
  /** Pflichtposten, die noch fehlen, angefordert oder offen sind. */
  offenePflicht: string[];
  /** Prüfpunkte auf „kritisch“. */
  kritisch: string[];
}

export function pruefstand(o: Objekt): Pruefstand {
  const unterlagen = unterlagenFuer(o);
  const punkte = pruefpunkteFuer(o);
  let erledigt = 0;
  const offenePflicht: string[] = [];
  const kritisch: string[] = [];

  for (const u of unterlagen) {
    const s = unterlagenstatus(o, u.id);
    if (s === "liegt_vor") erledigt += 1;
    else if (u.pflicht) offenePflicht.push(u.titel);
  }
  for (const p of punkte) {
    const s = punktstatus(o, p.id);
    if (s === "ok") erledigt += 1;
    else if (s === "kritisch") kritisch.push(p.titel);
    else if (p.pflicht) offenePflicht.push(p.titel);
  }

  return {
    erledigt,
    gesamt: unterlagen.length + punkte.length,
    ampel: kritisch.length > 0 ? "rot" : offenePflicht.length > 0 ? "gelb" : "gruen",
    offenePflicht,
    kritisch,
  };
}

export const AMPEL_FARBE: Record<Ampel, { farbe: string; weich: string; tief: string }> = {
  gruen: { farbe: "#17935C", weich: "#DBF2E6", tief: "#0C5E3A" },
  gelb: { farbe: "#E0992A", weich: "#FAE8CD", tief: "#8A5608" },
  rot: { farbe: "#CF4848", weich: "#FBE2E2", tief: "#9A2727" },
};

/**
 * Bei diesen Wechseln wird gewarnt: das Angebot (früher „Verhandlung“) und
 * der Kauf. Früher ist Prüfen Arbeit, keine Bedingung.
 */
const WARNSTUFEN: Ankaufsstufe[] = ["angebot", "angekauft"];

/** Was vor dem Wechsel noch offen ist — oder null, wenn nichts zu sagen ist. */
export function warnungFuer(o: Objekt, ziel: Ankaufsstufe): Pruefstand | null {
  if (!WARNSTUFEN.includes(ziel) || o.stufe === ziel || o.stufe === "angekauft") return null;
  const s = pruefstand(o);
  return s.offenePflicht.length > 0 || s.kritisch.length > 0 ? s : null;
}
