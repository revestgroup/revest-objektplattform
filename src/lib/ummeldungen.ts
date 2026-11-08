/**
 * Ummeldungen nach dem Besitzübergang — und Abmeldungen, wenn eine Einheit
 * verkauft ist. Sieben Stellen, die erfahren müssen, dass jemand anderes
 * zahlt: vergisst man eine, laufen Abschläge monatelang auf den Falschen.
 */
import type { Objekt } from "./objekte";

export type Ummeldeart =
  | "hausverwaltung"
  | "gas"
  | "strom"
  | "wasser"
  | "versicherung"
  | "schornsteinfeger"
  | "grundbesitzabgaben";

export type Ummeldestatus = "offen" | "gemeldet" | "bestaetigt" | "entfaellt";

/**
 * Reihenfolge = Bewirtschaftungsordner im Drive (00 bis 06). Jede Art kennt
 * ihren Ordner, damit der Reiter zeigen kann, was dort schon liegt.
 */
export const UMMELDEARTEN: { art: Ummeldeart; titel: string; ordner: string; zaehler: boolean }[] =
  [
    {
      art: "hausverwaltung",
      titel: "Hausverwaltung",
      ordner: "01_Unterlagen/02_Bewirtschaftung/00_Hausverwaltung",
      zaehler: false,
    },
    { art: "gas", titel: "Gas", ordner: "01_Unterlagen/02_Bewirtschaftung/01_Gas", zaehler: true },
    {
      art: "strom",
      titel: "Strom",
      ordner: "01_Unterlagen/02_Bewirtschaftung/02_Strom",
      zaehler: true,
    },
    {
      art: "wasser",
      titel: "Wasser / Stadtwerke",
      ordner: "01_Unterlagen/02_Bewirtschaftung/03_Wasser_Stadtwerke",
      zaehler: true,
    },
    {
      art: "versicherung",
      titel: "Versicherung",
      ordner: "01_Unterlagen/02_Bewirtschaftung/04_Versicherung",
      zaehler: false,
    },
    {
      art: "schornsteinfeger",
      titel: "Schornsteinfeger",
      ordner: "01_Unterlagen/02_Bewirtschaftung/05_Schornsteinfeger",
      zaehler: false,
    },
    {
      art: "grundbesitzabgaben",
      titel: "Grundbesitzabgaben Stadt",
      ordner: "01_Unterlagen/02_Bewirtschaftung/06_Grundbesitzabgaben_Stadt",
      zaehler: false,
    },
  ];

export const UMMELDESTATUS: Record<Ummeldestatus, string> = {
  offen: "offen",
  gemeldet: "gemeldet",
  bestaetigt: "bestätigt",
  entfaellt: "entfällt",
};

export interface Ummeldung {
  id: string;
  art: Ummeldeart;
  /** `an`: Ummeldung auf Revest nach dem Besitzübergang. `ab`: Abmeldung beim Verkauf einer Einheit. */
  richtung: "an" | "ab";
  /** Nur bei Abmeldungen: welche Einheit. */
  einheitId?: string | null;
  status: Ummeldestatus;
  anbieter?: string | null;
  zaehlernummer?: string | null;
  zaehlerstand?: string | null;
  gemeldetAm?: string | null;
  bestaetigtAm?: string | null;
  notiz?: string | null;
}

/** Nach so vielen Tagen ohne Fortschritt erscheint eine Ummeldung auf der Startseite. */
export const UMMELDUNG_FRIST_TAGE = 14;

function neueListe(richtung: "an" | "ab", praefix: string, einheitId?: string): Ummeldung[] {
  return UMMELDEARTEN.map(({ art }) => ({
    id: `${praefix}-${art}`,
    art,
    richtung,
    einheitId: einheitId ?? null,
    status: "offen" as const,
  }));
}

/**
 * Legt die Ummeldungen an, sobald ein Besitzübergang eingetragen ist — aber
 * nur einmal. Gibt das Objekt unverändert zurück, wenn nichts zu tun ist.
 */
export function mitUmmeldungen(o: Objekt): Objekt {
  if (!o.besitzuebergangAm) return o;
  if ((o.ummeldungen ?? []).some((u) => u.richtung === "an")) return o;
  return { ...o, ummeldungen: [...neueListe("an", `um-${o.id}`), ...(o.ummeldungen ?? [])] };
}

/** Abmeldungen für eine verkaufte Einheit, ebenfalls nur einmal. */
export function mitAbmeldungen(o: Objekt, einheitId: string): Objekt {
  if ((o.ummeldungen ?? []).some((u) => u.richtung === "ab" && u.einheitId === einheitId)) return o;
  return {
    ...o,
    ummeldungen: [...(o.ummeldungen ?? []), ...neueListe("ab", `ab-${einheitId}`, einheitId)],
  };
}

/**
 * Verkauf zurückgenommen: Abmeldungen, an denen noch niemand etwas getan hat,
 * verschwinden. Wer schon gemeldet hat, behält den Eintrag — der Vorgang muss
 * dann bewusst zurückgedreht werden.
 */
export function ohneOffeneAbmeldungen(o: Objekt, einheitId: string): Objekt {
  const liste = o.ummeldungen ?? [];
  const eigene = liste.filter((u) => u.richtung === "ab" && u.einheitId === einheitId);
  const unberuehrt = eigene.every(
    (u) => u.status === "offen" && !u.anbieter && !u.notiz && !u.zaehlerstand,
  );
  if (!unberuehrt) return o;
  return {
    ...o,
    ummeldungen: liste.filter((u) => !(u.richtung === "ab" && u.einheitId === einheitId)),
  };
}

/** Ab wann eine Ummeldung zählt: Besitzübergang, bei Abmeldungen der Verkauf. */
export function stichtag(o: Objekt, u: Ummeldung): string | null {
  if (u.richtung === "an") return o.besitzuebergangAm ?? null;
  return o.einheiten.find((e) => e.id === u.einheitId)?.verkauftAm ?? null;
}

/**
 * Überfällig: offen und der Stichtag liegt mehr als 14 Tage zurück — oder
 * gemeldet, aber seit 14 Tagen ohne Bestätigung.
 */
export function istUeberfaellig(o: Objekt, u: Ummeldung, jetzt: Date = new Date()): boolean {
  const grenze = jetzt.getTime() - UMMELDUNG_FRIST_TAGE * 86_400_000;
  if (u.status === "offen") {
    const s = stichtag(o, u);
    return s !== null && new Date(s).getTime() < grenze;
  }
  if (u.status === "gemeldet") {
    return u.gemeldetAm != null && new Date(u.gemeldetAm).getTime() < grenze;
  }
  return false;
}

export function ueberfaelligeUmmeldungen(o: Objekt, jetzt: Date = new Date()): Ummeldung[] {
  return (o.ummeldungen ?? []).filter((u) => istUeberfaellig(o, u, jetzt));
}
