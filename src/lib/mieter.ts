/**
 * Mieter.
 *
 * Ein Mieter ist kein Lead. Ein Lead hat ein Budget und wird zum Käufer; ein
 * Mieter hat ein Nettoeinkommen und zieht ein. Deshalb steht er hier und nicht
 * in `leads.ts`.
 *
 * Die Zuordnung gehört dem Mieter, nicht der Einheit. Nur so gibt es eine
 * Wahrheit: wer wo wohnt, steht genau an einer Stelle. Die Garantie rechnet
 * ihre Ist-Miete aus den Mietern, die ihr zugeordnet sind — sie führt keine
 * eigene Liste, die auseinanderlaufen könnte.
 *
 * Die eine Zahl, die eine Entscheidung erzwingt, ist die Mietbelastungsquote:
 * Kaltmiete geteilt durch Nettoeinkommen. Darüber redet man mit dem Bürgen.
 */

export type Mieterstatus =
  | "interessent"
  | "unterlagen"
  | "geprueft"
  | "zugeordnet"
  | "vertrag_raus"
  | "eingezogen"
  | "ausgezogen"
  | "abgelehnt";

export const MIETERSTATUS: Record<
  Mieterstatus,
  {
    titel: string;
    farbe: string;
    weich: string;
    tief: string;
    /** Belegt einen Platz — auch ohne Einzug ist das Zimmer dann weg. */
    belegt: boolean;
    /** Zahlt Miete. Nur das zählt in die Deckung. */
    zahlt: boolean;
    /** Steht noch zur Zuordnung bereit. */
    offen: boolean;
  }
> = {
  interessent: {
    titel: "Interessent",
    farbe: "#3E7BD6",
    weich: "#E0EAFA",
    tief: "#1F4E92",
    belegt: false,
    zahlt: false,
    offen: true,
  },
  unterlagen: {
    titel: "Unterlagen offen",
    farbe: "#E5C02E",
    weich: "#FBF4D1",
    tief: "#7A6508",
    belegt: false,
    zahlt: false,
    offen: true,
  },
  geprueft: {
    titel: "Geprüft",
    farbe: "#E5A32E",
    weich: "#FBEBD1",
    tief: "#8A5A08",
    belegt: false,
    zahlt: false,
    offen: true,
  },
  zugeordnet: {
    titel: "Zugeordnet",
    farbe: "#D9792B",
    weich: "#FAE6D4",
    tief: "#8C4408",
    belegt: true,
    zahlt: false,
    offen: false,
  },
  vertrag_raus: {
    titel: "Vertrag versendet",
    farbe: "#7A5BD6",
    weich: "#E8E2FA",
    tief: "#452F8E",
    belegt: true,
    zahlt: false,
    offen: false,
  },
  eingezogen: {
    titel: "Eingezogen",
    farbe: "#17935C",
    weich: "#DBF2E6",
    tief: "#0C5E3A",
    belegt: true,
    zahlt: true,
    offen: false,
  },
  ausgezogen: {
    titel: "Ausgezogen",
    farbe: "#A3ABB8",
    weich: "#EEF0F4",
    tief: "#525C6B",
    belegt: false,
    zahlt: false,
    offen: false,
  },
  abgelehnt: {
    titel: "Abgelehnt",
    farbe: "#C5453B",
    weich: "#F8DEDC",
    tief: "#8A2822",
    belegt: false,
    zahlt: false,
    offen: false,
  },
};

export const MIETERSTATUS_REIHENFOLGE: Mieterstatus[] = [
  "interessent",
  "unterlagen",
  "geprueft",
  "zugeordnet",
  "vertrag_raus",
  "eingezogen",
  "ausgezogen",
  "abgelehnt",
];

/* ------------------------------------------------------------------ */
/* Unterlagen                                                           */
/* ------------------------------------------------------------------ */

export type Unterlagenart =
  | "ausweis"
  | "gehaltsnachweis"
  | "arbeitsvertrag"
  | "schufa"
  | "mietschuldenfreiheit"
  | "buergschaft"
  | "mietvertrag"
  | "sonstiges";

export const UNTERLAGENARTEN: Record<Unterlagenart, { titel: string; pflicht: boolean }> = {
  ausweis: { titel: "Ausweis", pflicht: true },
  gehaltsnachweis: { titel: "Gehaltsnachweise", pflicht: true },
  arbeitsvertrag: { titel: "Arbeitsvertrag", pflicht: false },
  schufa: { titel: "SCHUFA-Auskunft", pflicht: true },
  mietschuldenfreiheit: { titel: "Mietschuldenfreiheit", pflicht: true },
  buergschaft: { titel: "Bürgschaftserklärung", pflicht: false },
  mietvertrag: { titel: "Mietvertrag", pflicht: false },
  sonstiges: { titel: "Sonstiges", pflicht: false },
};

/** Was vorliegen muss, bevor jemand zugeordnet wird. Mit Bürge eine mehr. */
export const PFLICHT_UNTERLAGEN: Unterlagenart[] = [
  "ausweis",
  "gehaltsnachweis",
  "schufa",
  "mietschuldenfreiheit",
];

/**
 * Eine Unterlage liegt zweimal: in Supabase Storage als Wahrheit und Backup,
 * in Google Drive als Arbeitsablage. Hier steht nie der Inhalt, immer nur der
 * Weg dorthin — in Phase 1 sind beide Felder leer.
 */
export interface Mieterunterlage {
  id: string;
  art: Unterlagenart;
  titel: string;
  dateiname: string;
  hochgeladenAm: string;
  /** Pfad im Supabase Storage. */
  speicherpfad: string | null;
  /** Datei-ID in Google Drive. */
  driveId: string | null;
  /** Gehaltsnachweise und SCHUFA veralten. Null heißt: gilt unbefristet. */
  gueltigBis: string | null;
}

/** Abgelaufen heißt: liegt vor, zählt aber nicht mehr. */
export function istAbgelaufen(u: Mieterunterlage, heute = new Date()): boolean {
  return u.gueltigBis !== null && new Date(u.gueltigBis).getTime() < heute.getTime();
}

/* ------------------------------------------------------------------ */
/* Bürge                                                                */
/* ------------------------------------------------------------------ */

export interface Buerge {
  name: string;
  /** „Vater", „Arbeitgeber", „Lebenspartnerin" — sagt mehr als ein Haken. */
  beziehung: string | null;
  telefon: string | null;
  email: string | null;
  nettoeinkommen: number | null;
  unterlagen: Mieterunterlage[];
}

/* ------------------------------------------------------------------ */
/* Mietvertrag                                                          */
/* ------------------------------------------------------------------ */

export type Vertragskanal = "e_signatur" | "email" | "post";

export const VERTRAGSKANAELE: Record<Vertragskanal, string> = {
  e_signatur: "E-Signatur",
  email: "E-Mail",
  post: "Post",
};

export type Vertragsstatus = "entwurf" | "versendet" | "unterschrieben" | "abgelehnt";

/*
 * Diese Farben stehen nicht nur im Punkt, sondern auch im Text daneben
 * (`Mieterliste.tsx`, Statuszeile bei 0,8rem). Deshalb sind sie so tief
 * gewaehlt, dass sie auf Weiss und auf `grund` mindestens 4,5:1 erreichen —
 * die Entwuerfe #8A93A1, #D9792B und #17935C lagen mit 3,1 / 3,1 / 3,9 noch
 * darunter und waren als Schrift zu schwach.
 */
export const VERTRAGSSTATUS: Record<Vertragsstatus, { titel: string; farbe: string }> = {
  entwurf: { titel: "Entwurf", farbe: "#636A74" },
  versendet: { titel: "Versendet", farbe: "#A85E21" },
  unterschrieben: { titel: "Unterschrieben", farbe: "#148151" },
  abgelehnt: { titel: "Abgelehnt", farbe: "#C5453B" },
};

/**
 * Der Versand selbst kommt in Phase 2: n8n füllt die Vorlage, der
 * Signaturanbieter schickt sie raus, der Rücklauf landet wieder in Supabase
 * und im Drive-Ordner. `anbieterId` ist der Haken, an dem der Rücklauf hängt.
 */
export interface Vertragsversand {
  id: string;
  kanal: Vertragskanal;
  status: Vertragsstatus;
  versendetAm: string | null;
  unterschriebenAm: string | null;
  anbieterId: string | null;
}

/* ------------------------------------------------------------------ */
/* Mieter                                                               */
/* ------------------------------------------------------------------ */

export type Mieterquelle = "leadseite" | "empfehlung" | "portal" | "wg_gesucht" | "manuell";

export const MIETERQUELLEN: Record<Mieterquelle, string> = {
  leadseite: "Leadseite",
  empfehlung: "Empfehlung",
  portal: "Portal",
  wg_gesucht: "WG-Gesucht",
  manuell: "Selbst angelegt",
};

export interface Mieter {
  id: string;
  name: string;
  email: string | null;
  telefon: string | null;
  geburtsdatum: string | null;

  beruf: string | null;
  arbeitgeber: string | null;
  /** Monatliches Nettoeinkommen. Grundlage der Mietbelastungsquote. */
  nettoeinkommen: number | null;

  status: Mieterstatus;
  quelle: Mieterquelle;

  /** Zuordnung. Bei einer WG zeigt `zimmerId` auf das Zimmer. */
  garantieId: string | null;
  zimmerId: string | null;
  /** Vereinbarte Kaltmiete. Weicht bewusst von der Sollmiete ab, wenn verhandelt wurde. */
  miete: number | null;
  einzugAm: string | null;
  auszugAm: string | null;

  buerge: Buerge | null;
  unterlagen: Mieterunterlage[];
  vertrag: Vertragsversand | null;

  notiz: string | null;
  angelegtAm: string;
}

/* ------------------------------------------------------------------ */
/* Abgeleitete Werte                                                    */
/* ------------------------------------------------------------------ */

/** Belegt der Mieter gerade einen Platz? Reserviert zählt mit. */
export function belegtPlatz(m: Mieter): boolean {
  return m.garantieId !== null && MIETERSTATUS[m.status].belegt;
}

/** Zahlt der Mieter gerade Miete? Nur das geht in die Deckung ein. */
export function zahltMiete(m: Mieter): boolean {
  return m.garantieId !== null && MIETERSTATUS[m.status].zahlt;
}

/**
 * Kaltmiete im Verhältnis zum Nettoeinkommen, in Prozent.
 * Bis 33 % unkritisch, bis 40 % Gespräch, darüber Bürge.
 */
export function mietbelastung(m: Mieter): number | null {
  if (!m.miete || !m.nettoeinkommen) return null;
  return (m.miete / m.nettoeinkommen) * 100;
}

export type Belastungsurteil = "gut" | "grenzwertig" | "kritisch";

export function belastungsurteil(quote: number): Belastungsurteil {
  if (quote <= 33) return "gut";
  if (quote <= 40) return "grenzwertig";
  return "kritisch";
}

export const BELASTUNGSFARBEN: Record<Belastungsurteil, string> = {
  gut: "#17935C",
  grenzwertig: "#E5A32E",
  kritisch: "#C5453B",
};

export interface Unterlagenstand {
  /** Pflichtunterlagen, die gültig vorliegen. */
  erledigt: number;
  /** Pflichtunterlagen insgesamt — mit Bürge eine mehr. */
  noetig: number;
  vollstaendig: boolean;
  /** Was fehlt oder abgelaufen ist. */
  offen: Unterlagenart[];
  /** Liegt vor, ist aber nicht mehr gültig. */
  abgelaufen: Unterlagenart[];
}

export function unterlagenstand(m: Mieter, heute = new Date()): Unterlagenstand {
  const noetig = [...PFLICHT_UNTERLAGEN, ...(m.buerge ? (["buergschaft"] as const) : [])];

  const offen: Unterlagenart[] = [];
  const abgelaufen: Unterlagenart[] = [];

  for (const art of noetig) {
    const treffer = m.unterlagen.filter((u) => u.art === art);
    if (treffer.length === 0) {
      offen.push(art);
      continue;
    }
    if (treffer.every((u) => istAbgelaufen(u, heute))) {
      offen.push(art);
      abgelaufen.push(art);
    }
  }

  return {
    erledigt: noetig.length - offen.length,
    noetig: noetig.length,
    vollstaendig: offen.length === 0,
    offen,
    abgelaufen,
  };
}
