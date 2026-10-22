/**
 * Leads.
 *
 * Zwei Richtungen laufen über dieselbe Liste, weil sie denselben Trichter
 * haben — nur die Schlussfolgerung ist eine andere:
 *
 *   verkaeufer — jemand bietet eine Immobilie an. Wird er zum Deal, entsteht
 *                daraus ein Objekt im Bestand.
 *   kaeufer    — ein Kapitalanleger sucht eine Einheit. Wird er zum Deal,
 *                entsteht daraus eine Mietgarantie.
 *
 * Herkunft ist bewusst getrennt vom Status: ob ein Lead über das Formular
 * der Website kam oder Timo ihn nach einem Telefonat selbst angelegt hat,
 * ändert nichts am Trichter, aber alles an der Erwartungshaltung.
 */

export type Leadrichtung = "verkaeufer" | "kaeufer";

export const LEADRICHTUNGEN: Record<Leadrichtung, { titel: string; kurz: string }> = {
  verkaeufer: { titel: "Bietet an", kurz: "Verkäufer" },
  kaeufer: { titel: "Sucht Kapitalanlage", kurz: "Käufer" },
};

export type Leadquelle = "leadseite" | "manuell" | "empfehlung" | "portal" | "telefon";

export const LEADQUELLEN: Record<Leadquelle, string> = {
  leadseite: "Leadseite",
  manuell: "Selbst angelegt",
  empfehlung: "Empfehlung",
  portal: "Portal",
  telefon: "Telefon",
};

export type Leadstatus = "neu" | "kontaktiert" | "qualifiziert" | "termin" | "deal" | "abgelehnt";

export const LEADSTATUS_REIHENFOLGE: Leadstatus[] = [
  "neu",
  "kontaktiert",
  "qualifiziert",
  "termin",
  "deal",
  "abgelehnt",
];

export const LEADSTATUS: Record<
  Leadstatus,
  { titel: string; farbe: string; weich: string; tief: string; offen: boolean }
> = {
  neu: { titel: "Neu", farbe: "#3E7BD6", weich: "#E0EAFA", tief: "#1F4E92", offen: true },
  kontaktiert: {
    titel: "Kontaktiert",
    farbe: "#E5C02E",
    weich: "#FBF4D1",
    tief: "#7A6508",
    offen: true,
  },
  qualifiziert: {
    titel: "Qualifiziert",
    farbe: "#E5A32E",
    weich: "#FBEBD1",
    tief: "#8A5A08",
    offen: true,
  },
  termin: { titel: "Termin", farbe: "#D9792B", weich: "#FAE6D4", tief: "#8C4408", offen: true },
  deal: { titel: "Abschluss", farbe: "#17935C", weich: "#DBF2E6", tief: "#0C5E3A", offen: false },
  abgelehnt: {
    titel: "Kein Interesse",
    farbe: "#C5453B",
    weich: "#F8DEDC",
    tief: "#8A2822",
    offen: false,
  },
};

export type Leadinteresse = "kapitalanlage" | "wg" | "eigennutzung" | "verkauf";

export const LEADINTERESSEN: Record<Leadinteresse, string> = {
  kapitalanlage: "Kapitalanlage",
  wg: "WG-Konzept",
  eigennutzung: "Eigennutzung",
  verkauf: "Verkauf",
};

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  telefon: string | null;

  richtung: Leadrichtung;
  quelle: Leadquelle;
  status: Leadstatus;
  interesse: Leadinteresse;

  /** Bei Käufern das Budget, bei Verkäufern die Preisvorstellung. */
  budget: number | null;
  /** Freitext aus dem Formular — bei Verkäufern meist die Adresse. */
  nachricht: string | null;
  /** Objekt, auf das sich der Lead bezieht. */
  objektId: string | null;

  notiz: string | null;
  eingegangenAm: string;
}

/** Wie lange liegt der Lead schon da? Bei „neu" ist das die wichtigste Zahl. */
export function tageOffen(lead: Lead, heute = new Date()): number {
  const ms = heute.getTime() - new Date(lead.eingegangenAm).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
