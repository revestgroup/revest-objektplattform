/**
 * Abwicklung nach Kauf und Verkauf (SAMMLUNG 1): Ummeldungen nach dem
 * Besitzübergang, Abmeldungen beim Verkauf einer Einheit. Statt vier
 * Trello-Vorlagen eine Liste je Richtung, die sich nach der Objektart selbst
 * zusammenstellt (ETW oder EFH/MFH). Vergisst man eine Stelle, laufen
 * Abschläge monatelang auf den Falschen.
 */
import type { Objekt } from "./objekte";

export type Ummeldeart =
  | "hausverwaltung"
  | "sepa_hausgeld"
  | "verwaltungsliste"
  | "gas"
  | "strom"
  | "wasser"
  | "versicherung"
  | "grundbuch_versicherung"
  | "versicherung_abrechnung"
  | "schornsteinfeger"
  | "grundbesitzabgaben"
  | "grundsteuer_anteilig";

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
    {
      art: "grundsteuer_anteilig",
      titel: "Grundsteuer anteilig abrechnen",
      ordner: "01_Unterlagen/02_Bewirtschaftung/06_Grundbesitzabgaben_Stadt",
      zaehler: false,
    },
    {
      art: "sepa_hausgeld",
      titel: "SEPA-Lastschrift Hausgeld",
      ordner: "01_Unterlagen/02_Bewirtschaftung/00_Hausverwaltung",
      zaehler: false,
    },
    {
      art: "verwaltungsliste",
      titel: "Verwaltungsliste",
      ordner: "01_Unterlagen/02_Bewirtschaftung/00_Hausverwaltung",
      zaehler: false,
    },
    {
      art: "grundbuch_versicherung",
      titel: "Grundbuch-Umschreibung an Versicherung",
      ordner: "01_Unterlagen/02_Bewirtschaftung/04_Versicherung",
      zaehler: false,
    },
    {
      art: "versicherung_abrechnung",
      titel: "Abrechnung Versicherung",
      ordner: "01_Unterlagen/02_Bewirtschaftung/04_Versicherung",
      zaehler: false,
    },
  ];

export type Objektgruppe = "etw" | "haus" | "grundstueck";
export type Richtung = "an" | "ab";

/** ETW (auch die verkaufte Einheit eines geteilten Hauses), Haus (EFH/MFH/WGH) oder Grundstück. */
export function objektgruppe(
  o: Objekt,
  richtung: Richtung,
  einheitId?: string | null,
): Objektgruppe {
  if (o.objektart === "grundstueck") return "grundstueck";
  // Verkauft wird je Einheit — nach der Teilung ist sie eine Eigentumswohnung.
  if (richtung === "ab" && einheitId) return "etw";
  return o.objektart === "etw" ? "etw" : "haus";
}

/**
 * Die Tabellen aus SAMMLUNG 1: welche Punkte je Richtung und Objektart.
 * Reihenfolge = Reihenfolge in der Liste.
 */
const LISTEN: Record<Richtung, Record<Objektgruppe, Ummeldeart[]>> = {
  an: {
    etw: ["grundbesitzabgaben", "grundsteuer_anteilig", "strom", "hausverwaltung", "sepa_hausgeld"],
    haus: [
      "verwaltungsliste",
      "grundbesitzabgaben",
      "grundsteuer_anteilig",
      "strom",
      "gas",
      "wasser",
      "schornsteinfeger",
      "versicherung",
    ],
    grundstueck: ["grundbesitzabgaben", "grundsteuer_anteilig"],
  },
  ab: {
    etw: ["grundbesitzabgaben", "grundsteuer_anteilig", "strom", "hausverwaltung"],
    haus: [
      "grundbesitzabgaben",
      "grundsteuer_anteilig",
      "strom",
      "gas",
      "wasser",
      "versicherung",
      "grundbuch_versicherung",
      "versicherung_abrechnung",
      "schornsteinfeger",
    ],
    grundstueck: ["grundbesitzabgaben", "grundsteuer_anteilig"],
  },
};

export function artenFuer(o: Objekt, richtung: Richtung, einheitId?: string | null): Ummeldeart[] {
  return LISTEN[richtung][objektgruppe(o, richtung, einheitId)];
}

/** Was in der Liste steht — je Richtung genauer als der Sammeltitel. */
const TITEL: Partial<Record<Ummeldeart, Record<Richtung, string>>> = {
  hausverwaltung: {
    an: "Info an Verwalter wegen Hausgeld",
    ab: "Info an Verwalter wegen Hausgeld",
  },
  grundbesitzabgaben: {
    an: "Übernahmeerklärung Grundsteuer / Grundbesitzabgaben an Stadt",
    ab: "Übernahmeerklärung Grundsteuer / Grundbesitzabgaben an Stadt",
  },
  grundsteuer_anteilig: {
    an: "Grundsteuer anteilig mit Voreigentümer abrechnen",
    ab: "Grundsteuer anteilig mit Käufer abrechnen",
  },
  strom: { an: "Strom anmelden, Zählerstand", ab: "Strom abmelden, Zählerstand" },
  gas: { an: "Gas anmelden, Zählerstand", ab: "Gas abmelden, Zählerstand" },
  wasser: { an: "Wasser anmelden, Zählerstand", ab: "Wasser abmelden, Zählerstand" },
  versicherung: {
    an: "Versicherung: Übergabezeitpunkt mitteilen",
    ab: "Wohngebäudeversicherung informieren",
  },
  verwaltungsliste: { an: "Immobilie in Verwaltungsliste erfassen", ab: "Verwaltungsliste" },
  schornsteinfeger: {
    an: "Schornsteinfeger über Eigentümerwechsel informieren",
    ab: "Schornsteinfeger neuen Eigentümer mitteilen",
  },
  grundbuch_versicherung: {
    an: "Grundbuch-Umschreibung an Versicherung",
    ab: "Umschreibung Grundbuch an Wohngebäudeversicherung melden",
  },
  versicherung_abrechnung: {
    an: "Abrechnung Versicherung",
    ab: "Abrechnung Wohngebäudeversicherung (bis Umschreibung)",
  },
};

export function ummeldeTitel(art: Ummeldeart, richtung: Richtung): string {
  return TITEL[art]?.[richtung] ?? UMMELDEARTEN.find((a) => a.art === art)?.titel ?? art;
}

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

function eintraege(
  arten: Ummeldeart[],
  richtung: Richtung,
  praefix: string,
  einheitId?: string | null,
): Ummeldung[] {
  return arten.map((art) => ({
    id: `${praefix}-${art}`,
    art,
    richtung,
    einheitId: einheitId ?? null,
    status: "offen" as const,
  }));
}

/**
 * Ergänzt eine bestehende Liste um die Punkte, die nach Objektart und
 * Richtung dazugehören — ältere Stände hatten sieben feste Punkte. Nichts
 * wird gelöscht.
 */
function ergaenzt(
  o: Objekt,
  liste: Ummeldung[],
  richtung: Richtung,
  einheitId: string | null,
  praefix: string,
): Ummeldung[] {
  const vorhanden = liste.filter(
    (u) => u.richtung === richtung && (u.einheitId ?? null) === einheitId,
  );
  const fehlen = artenFuer(o, richtung, einheitId).filter(
    (a) => !vorhanden.some((u) => u.art === a),
  );
  return fehlen.length ? [...liste, ...eintraege(fehlen, richtung, praefix, einheitId)] : liste;
}

/**
 * Legt die Ummeldungen an, sobald ein Besitzübergang eingetragen ist — und
 * ergänzt fehlende Punkte. Gibt das Objekt unverändert zurück, wenn nichts zu
 * tun ist (der Speicher ruft das bei jeder Änderung auf).
 */
export function mitUmmeldungen(o: Objekt): Objekt {
  const start = o.ummeldungen ?? [];
  let liste = start;
  if (o.besitzuebergangAm) liste = ergaenzt(o, liste, "an", null, `um-${o.id}`);
  const einheiten = [
    ...new Set(liste.filter((u) => u.richtung === "ab").map((u) => u.einheitId ?? null)),
  ];
  for (const e of einheiten) liste = ergaenzt(o, liste, "ab", e, `ab-${e}`);
  return liste === start ? o : { ...o, ummeldungen: liste };
}

/** Abmeldungen für eine verkaufte Einheit, ebenfalls nur einmal. */
export function mitAbmeldungen(o: Objekt, einheitId: string): Objekt {
  if ((o.ummeldungen ?? []).some((u) => u.richtung === "ab" && u.einheitId === einheitId)) return o;
  return {
    ...o,
    ummeldungen: [
      ...(o.ummeldungen ?? []),
      ...eintraege(artenFuer(o, "ab", einheitId), "ab", `ab-${einheitId}`, einheitId),
    ],
  };
}

/**
 * Was die Liste zeigt: die zutreffenden Punkte in ihrer Reihenfolge, dazu
 * ältere Punkte, die nicht mehr dazugehören, aber schon bearbeitet wurden.
 */
export function sichtbareUmmeldungen(
  o: Objekt,
  richtung: Richtung,
  einheitId: string | null,
): Ummeldung[] {
  const liste = (o.ummeldungen ?? []).filter(
    (u) => u.richtung === richtung && (u.einheitId ?? null) === einheitId,
  );
  const arten = artenFuer(o, richtung, einheitId);
  const passend = arten.flatMap((a) => liste.filter((u) => u.art === a));
  const alt = liste.filter(
    (u) =>
      !arten.includes(u.art) &&
      (u.status !== "offen" || u.anbieter || u.notiz || u.zaehlerstand || u.zaehlernummer),
  );
  return [...passend, ...alt];
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
  const sichtbar = new Set(
    [
      ...sichtbareUmmeldungen(o, "an", null),
      ...[
        ...new Set(
          (o.ummeldungen ?? []).filter((u) => u.richtung === "ab").map((u) => u.einheitId ?? null),
        ),
      ].flatMap((e) => sichtbareUmmeldungen(o, "ab", e)),
    ].map((u) => u.id),
  );
  return (o.ummeldungen ?? []).filter((u) => sichtbar.has(u.id) && istUeberfaellig(o, u, jetzt));
}

/* ------------------------------------------------------------------ */
/* Übergabe: Pflichtangaben                                             */
/* ------------------------------------------------------------------ */

export interface Uebergabeangaben {
  datum: string | null;
  gesellschaft: string | null;
  /** Mail des Verkäufers (Ankauf) bzw. Käufers (Verkauf). */
  email: string | null;
  /** Nur bei ETW nötig. */
  hausverwaltung: string | null;
}

/** Welche Pflichtangaben fehlen — Hausverwaltung nur bei ETW. */
export function fehlendeAngaben(a: Uebergabeangaben, gruppe: Objektgruppe): string[] {
  const fehlt: string[] = [];
  if (!a.datum) fehlt.push("Übergabedatum");
  if (!a.gesellschaft) fehlt.push("Gesellschaft");
  if (!a.email) fehlt.push("E-Mail");
  if (gruppe === "etw" && !a.hausverwaltung) fehlt.push("Hausverwaltung");
  return fehlt;
}
