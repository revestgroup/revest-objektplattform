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

export type Unterlagenstatus = "fehlt" | "angefordert" | "liegt_vor" | "entfaellt";
export type Punktstatus = "offen" | "ok" | "kritisch";

export const UNTERLAGENSTATUS: Record<Unterlagenstatus, string> = {
  fehlt: "fehlt",
  angefordert: "angefordert",
  liegt_vor: "liegt vor",
  entfaellt: "entfällt",
};

export const PUNKTSTATUS: Record<Punktstatus, string> = {
  offen: "offen",
  ok: "ok",
  kritisch: "kritisch",
};

/** Gespeichert am Objekt. Fehlt ein Eintrag, gilt „fehlt“ bzw. „offen“. */
export interface Pruefung {
  unterlagen?: Record<
    string,
    {
      status: Unterlagenstatus;
      dokumentId?: string | null;
      /** Stand der Unterlage (ISO-Datum), z. B. beim Grundbuchauszug. */
      datum?: string | null;
    }
  >;
  punkte?: Record<string, { status: Punktstatus; notiz?: string | null }>;
}

/**
 * Drei Gruppen (bestätigt von Timo): Basis = immer nötig, auch für die
 * Finanzierung · Objektart = je nach ETW/EFH/MFH bzw. vermietet/Erbbaurecht ·
 * Intern = für den weiteren Verlauf und die eigene Akquise.
 */
export type Unterlagengruppe = "basis" | "objektart" | "intern";
export const UNTERLAGENGRUPPEN: Record<Unterlagengruppe, string> = {
  basis: "Basis",
  objektart: "Objektart",
  intern: "Intern",
};

/** Für welche Objekte eine Unterlage gilt. */
type Gilt = "alle" | "haus" | "weg" | "vermietet" | "erbbau";

export interface Pruefposten {
  id: string;
  titel: string;
  /** Pflicht heißt: fehlt sie, warnt der Wechsel ins Angebot bzw. in den Kauf. */
  pflicht: boolean;
}

export interface Unterlage extends Pruefposten {
  nr: number;
  gruppe: Unterlagengruppe;
  gilt: Gilt;
}

const u = (
  nr: number,
  gruppe: Unterlagengruppe,
  id: string,
  titel: string,
  gilt: Gilt,
): Unterlage => ({
  nr,
  gruppe,
  id,
  titel,
  gilt,
  pflicht: gruppe === "basis",
});

/** Timos „Checklist Advanced“ (SAMMLUNG 5), ergänzt um Punkte der Trello-Projektkarte. */
export const UNTERLAGEN: Unterlage[] = [
  u(1, "basis", "expose", "Exposé", "alle"),
  u(2, "basis", "wohnflaechenberechnung", "Wohnflächenberechnung", "alle"),
  u(3, "basis", "lageplan", "Katasterauszug / Lageplan", "haus"),
  u(4, "basis", "grundbuch", "Aktueller Grundbuchauszug (max. 3 Monate, inkl. Garage)", "alle"),
  u(5, "basis", "objektfotos", "Objektfotos innen/außen", "alle"),
  u(6, "basis", "teilungserklaerung", "Teilungserklärung", "weg"),
  u(7, "basis", "teilungsplaene", "Teilungspläne (Ansichten, Grundrisse, Schnitte)", "weg"),
  u(8, "basis", "weg_protokolle", "Protokolle Eigentümerversammlungen, letzte 3 Jahre", "weg"),
  u(9, "basis", "wirtschaftsplan", "Wirtschaftsplan aktuell", "weg"),
  u(10, "basis", "hausgeldabrechnung", "Letzte Hausgeldabrechnung", "weg"),
  u(11, "basis", "energieausweis", "Energieausweis", "alle"),
  u(12, "basis", "kaufvertragsentwurf", "Kaufvertragsentwurf", "alle"),
  u(13, "objektart", "baugenehmigung", "Baugenehmigung", "alle"),
  u(14, "objektart", "mietvertrag", "Mietverträge", "vermietet"),
  u(15, "objektart", "umbauter_raum", "Berechnung umbauter Raum", "haus"),
  u(16, "objektart", "gebaeudeversicherung", "Wohngebäudeversicherung", "haus"),
  u(
    17,
    "objektart",
    "erbbaurechtsvertrag",
    "Erbbaurechtsvertrag und aktuelle Höhe Erbpacht",
    "erbbau",
  ),
  u(18, "objektart", "ruecklagennachweis", "Rücklagennachweis", "weg"),
  u(19, "intern", "bodenrichtwert", "Bodenrichtwert", "alle"),
  u(20, "intern", "baubeschreibung", "Baubeschreibung", "haus"),
  u(21, "intern", "baulasten", "Auszug Baulastenverzeichnis", "alle"),
  u(22, "intern", "altlasten", "Auszug Altlastenregister", "alle"),
  u(23, "intern", "eigentuemerliste", "Eigentümerliste WEG", "weg"),
  u(24, "intern", "exposebilder", "Exposébilder im Original vom Makler", "alle"),
];

/** Bis 11.11.2026 hießen einige Unterlagen anders — gespeicherte Stände gelten weiter. */
const ALTE_IDS: Record<string, string[]> = {
  teilungsplaene: ["aufteilungsplan", "grundriss", "bauplaene"],
  mietvertrag: ["mietaufstellung"],
};

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
  // Die Auszüge selbst sind Unterlagen (Nr. 21, 22) — hier nur die Bewertung.
  { id: "altlasten", titel: "Baulasten / Altlasten: Bewertung", pflicht: true },
];

export function istWeg(o: Objekt): boolean {
  return o.objektart === "etw";
}

/** Haus = eigenes Gebäude mit Grundstück: EFH, MFH, Wohn- & Geschäftshaus. */
export function istHaus(o: Objekt): boolean {
  return o.objektart === "mfh" || o.objektart === "whg_geschaeftshaus" || o.objektart === "efh";
}

function gilt(x: Unterlage, o: Objekt): boolean {
  switch (x.gilt) {
    case "alle":
      return true;
    case "weg":
      return istWeg(o);
    case "haus":
      return istHaus(o);
    case "vermietet":
      return o.zustand === "vermietet";
    case "erbbau":
      return o.erbbaurecht;
  }
}

/** Die Liste stellt sich nach Objektart und Steckbrief selbst zusammen. */
export function unterlagenFuer(o: Objekt): Unterlage[] {
  return UNTERLAGEN.filter((x) => gilt(x, o));
}

export function pruefpunkteFuer(o: Objekt): Pruefposten[] {
  return PRUEFPUNKTE.filter((p) => istWeg(o) || !p.nurWeg);
}

/**
 * Woran man eine Datei als Unterlage erkennt. Der Name wird vorher klein
 * geschrieben und von Umlauten befreit („Teilungserklärung“ → „teilungserklaerung“).
 */
const DATEIMUSTER: Record<string, RegExp> = {
  expose: /expose(?!bild)/,
  wohnflaechenberechnung: /wohnflaeche|wfl/,
  lageplan: /lageplan|kataster|flurkarte/,
  grundbuch: /grundbuch/,
  objektfotos: /objektfoto|fotos?[_ -]|innen|aussen/,
  teilungserklaerung: /teilungserkl/,
  teilungsplaene: /teilungsplan|aufteilungsplan|grundriss|ansicht|schnitt/,
  weg_protokolle: /weg.?protokoll|eigentuemerversammlung|etv/,
  wirtschaftsplan: /wirtschaftsplan/,
  hausgeldabrechnung: /hausgeld/,
  energieausweis: /energieausweis/,
  kaufvertragsentwurf: /kaufvertrag|kv.?entwurf/,
  baugenehmigung: /baugenehmigung/,
  mietvertrag: /mietvertrag|mieterliste|mietaufstellung/,
  umbauter_raum: /umbauter|bri\b|kubatur/,
  gebaeudeversicherung: /versicherung/,
  erbbaurechtsvertrag: /erbbau|erbpacht/,
  ruecklagennachweis: /ruecklage/,
  bodenrichtwert: /bodenrichtwert|brw/,
  baubeschreibung: /baubeschreibung/,
  baulasten: /baulast/,
  altlasten: /altlast/,
  eigentuemerliste: /eigentuemerliste/,
  exposebilder: /exposebild|bilder.?original/,
};

function dateiname(n: string): string {
  return n
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

/** Gespeicherter Eintrag, auch unter einer früheren ID. */
function eintrag(o: Objekt, id: string) {
  const alle = o.pruefung?.unterlagen;
  if (!alle) return undefined;
  if (alle[id]) return alle[id];
  for (const alt of ALTE_IDS[id] ?? []) if (alle[alt]) return alle[alt];
  return undefined;
}

/**
 * Die Datei zu einer Unterlage: von Hand zugeordnet, sonst die erste, deren
 * Name passt. Von Hand gesetzt schlägt immer die Automatik — auch „keine Datei“.
 */
export function zugeordneteDatei(o: Objekt, id: string): Dokument | null {
  const gesetzt = eintrag(o, id);
  if (gesetzt && gesetzt.dokumentId !== undefined) {
    return o.dokumente.find((d) => d.id === gesetzt.dokumentId) ?? null;
  }
  const muster = DATEIMUSTER[id];
  return muster ? (o.dokumente.find((d) => muster.test(dateiname(d.name))) ?? null) : null;
}

/** Ohne eigenen Eintrag „liegt vor“, sobald eine passende Datei da ist. */
export function unterlagenstatus(o: Objekt, id: string): Unterlagenstatus {
  const gesetzt = eintrag(o, id)?.status;
  if (gesetzt) return gesetzt;
  return zugeordneteDatei(o, id) ? "liegt_vor" : "fehlt";
}

/* ----- Grundbuchauszug: nicht älter als 3 Monate ----- */

/** Datum aus dem Dateinamen: „2026-09-14“, „14.09.2026“ oder „20260914“. */
export function datumAusName(name: string): string | null {
  const iso = name.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const de = name.match(/(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])\.(20\d{2})/);
  if (de) return `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
  return null;
}

export interface Grundbuchstand {
  /** ISO-Datum des Auszugs: eingegeben, sonst aus dem Dateinamen. */
  datum: string | null;
  ausName: boolean;
  /** Älter als drei Monate → neu anfordern. */
  alt: boolean;
}

export function grundbuchstand(o: Objekt, heute = new Date()): Grundbuchstand {
  const eingegeben = eintrag(o, "grundbuch")?.datum ?? null;
  const datei = zugeordneteDatei(o, "grundbuch");
  const ausName = !eingegeben && datei ? datumAusName(datei.name) : null;
  const datum = eingegeben ?? ausName;
  if (!datum) return { datum: null, ausName: false, alt: false };
  const grenze = new Date(heute);
  grenze.setMonth(grenze.getMonth() - 3);
  return { datum, ausName: Boolean(ausName), alt: new Date(datum) < grenze };
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

/* ----- Finanzierung und Anforderung ----- */

/** Alle Basis-Unterlagen mit Stand — die Liste für die Bank. */
export function finanzierungsunterlagen(o: Objekt) {
  return unterlagenFuer(o)
    .filter((x) => x.gruppe === "basis")
    .map((x) => ({
      unterlage: x,
      status: unterlagenstatus(o, x.id),
      datei: zugeordneteDatei(o, x.id),
    }));
}

/** Was beim Makler anzufordern ist: fehlende Basis- und zutreffende Objektart-Unterlagen. */
export function fehlendeZumAnfordern(o: Objekt): Unterlage[] {
  return unterlagenFuer(o).filter(
    (x) => x.gruppe !== "intern" && unterlagenstatus(o, x.id) === "fehlt",
  );
}

export interface Anforderung {
  an: string;
  betreff: string;
  text: string;
  ids: string[];
}

/** Text des Gmail-Entwurfs. Betreff mit Kürzel, damit die Antwort zuordenbar bleibt. */
export function anforderungsMail(
  o: Objekt,
  makler: { name: string; email: string | null } | null,
  absender = "Timo Birk",
): Anforderung {
  const fehlend = fehlendeZumAnfordern(o);
  const adresse = `${o.strasse}, ${o.plz} ${o.stadt}`.trim();
  const kennung = o.kuerzel ? `[${o.kuerzel}] ` : "";
  const nachname = makler?.name.split(",").pop()?.trim() ?? "";
  const anrede = /^(herr|frau)\b/i.test(nachname) ? `Guten Tag ${nachname},` : "Guten Tag,";
  const text = [
    anrede,
    "",
    `vielen Dank für das Angebot ${adresse}. Für unsere Prüfung und die Finanzierung benötigen wir noch folgende Unterlagen:`,
    "",
    ...fehlend.map((x) => `- ${x.titel}`),
    "",
    "Gerne als PDF per Mail oder als Link zum Datenraum.",
    "",
    "Viele Grüße",
    absender,
    "Revest Projekt GmbH",
  ].join("\n");
  return {
    an: makler?.email ?? "",
    betreff: `${kennung}Unterlagen ${o.strasse}`,
    text,
    ids: fehlend.map((x) => x.id),
  };
}

/** Gmail-Entwurf im Browser: öffnet das Verfassen-Fenster, sendet nichts. */
export function gmailEntwurfLink(a: Pick<Anforderung, "an" | "betreff" | "text">): string {
  const q = new URLSearchParams({ view: "cm", fs: "1", to: a.an, su: a.betreff, body: a.text });
  return `https://mail.google.com/mail/?${q.toString()}`;
}

export type Ampel = "gruen" | "gelb" | "rot";

export interface Pruefstand {
  erledigt: number;
  gesamt: number;
  ampel: Ampel;
  /** Basis-Unterlagen, die noch fehlen oder angefordert sind. */
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

  let entfallen = 0;
  for (const u of unterlagen) {
    const s = unterlagenstatus(o, u.id);
    if (s === "liegt_vor") erledigt += 1;
    else if (s === "entfaellt") entfallen += 1;
    // Gewarnt wird nur bei fehlenden Basis-Unterlagen.
    else if (u.pflicht) offenePflicht.push(u.titel);
  }
  for (const p of punkte) {
    const s = punktstatus(o, p.id);
    if (s === "ok") erledigt += 1;
    else if (s === "kritisch") kritisch.push(p.titel);
  }

  return {
    erledigt,
    gesamt: unterlagen.length - entfallen + punkte.length,
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
