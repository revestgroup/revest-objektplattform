/**
 * Stadtteil-Grenzen von Ulm und Neu-Ulm.
 *
 * Die Geometrien kommen aus OpenStreetMap (Grenzrelationen admin_level 9/10),
 * sind mit Douglas-Peucker vereinfacht und liegen fertig in stadtteile.json.
 * Keine Laufzeit-Abfrage — die Grenzen ändern sich praktisch nie.
 */
import rohdaten from "./stadtteile.json";
import type { Objekt } from "./objekte";

export interface StadtteilEigenschaften {
  name: string;
  stadt: "Ulm" | "Neu-Ulm";
  bundesland: "BW" | "BY";
  /** "Ulm:Weststadt" — beide Städte haben eine Weststadt, der Name allein genügt nicht. */
  schluessel: string;
  mitte: [number, number];
}

export interface StadtteilFeature {
  type: "Feature";
  properties: StadtteilEigenschaften;
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
}

export interface StadtteilSammlung {
  type: "FeatureCollection";
  features: StadtteilFeature[];
}

export const STADTTEILE = rohdaten as unknown as StadtteilSammlung;

export const STADTTEIL_NAMEN = STADTTEILE.features.map((s) => s.properties);

/** Nachschlagen über "Stadt:Stadtteil". */
const nachSchluessel = new Map(STADTTEIL_NAMEN.map((s) => [s.schluessel, s]));

export function stadtteilVon(o: Objekt): StadtteilEigenschaften | undefined {
  return nachSchluessel.get(`${o.stadt}:${o.stadtteil}`);
}

export function stadtteileDerStadt(stadt: "Ulm" | "Neu-Ulm"): StadtteilEigenschaften[] {
  return STADTTEIL_NAMEN.filter((s) => s.stadt === stadt);
}

/* ------------------------------------------------------------------ */
/* Punkt-in-Polygon                                                     */
/* ------------------------------------------------------------------ */

function imRing(laenge: number, breite: number, ring: [number, number][]): boolean {
  let drin = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > breite !== yj > breite && laenge < ((xj - xi) * (breite - yi)) / (yj - yi) + xi) {
      drin = !drin;
    }
  }
  return drin;
}

/**
 * Welcher Stadtteil liegt unter dieser Koordinate?
 * Wird genutzt, wenn Timo auf eine freie Stelle der Karte klickt — der
 * Stadtteil ist dann schon vorausgefüllt, bevor er die Adresse eintippt.
 */
export function stadtteilAnPunkt(
  laenge: number,
  breite: number,
): StadtteilEigenschaften | undefined {
  for (const feature of STADTTEILE.features) {
    if (imRing(laenge, breite, feature.geometry.coordinates[0])) {
      return feature.properties;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Aggregation je Stadtteil                                             */
/* ------------------------------------------------------------------ */

export interface StadtteilBilanz {
  schluessel: string;
  name: string;
  stadt: string;
  anzahl: number;
  angekauft: number;
  aktiv: number;
  abgesagt: number;
  investiert: number;
  einheiten: number;
}

export function bilanzJeStadtteil(objekte: Objekt[]): Map<string, StadtteilBilanz> {
  const karte = new Map<string, StadtteilBilanz>();

  for (const s of STADTTEIL_NAMEN) {
    karte.set(s.schluessel, {
      schluessel: s.schluessel,
      name: s.name,
      stadt: s.stadt,
      anzahl: 0,
      angekauft: 0,
      aktiv: 0,
      abgesagt: 0,
      investiert: 0,
      einheiten: 0,
    });
  }

  for (const o of objekte) {
    const b = karte.get(`${o.stadt}:${o.stadtteil}`);
    if (!b) continue;
    b.anzahl += 1;
    b.einheiten += o.einheiten.length;
    if (o.stufe === "angekauft") {
      b.angekauft += 1;
      b.investiert += o.kaufpreis ?? 0;
    } else if (o.stufe === "abgesagt") {
      b.abgesagt += 1;
    } else {
      b.aktiv += 1;
    }
  }

  return karte;
}

/**
 * Begrenzungsrechteck über alle Stadtteile — der Start-Ausschnitt der Karte.
 * Wird einmal beim Laden berechnet, nicht bei jedem Render.
 */
export const GESAMT_AUSSCHNITT: [[number, number], [number, number]] = (() => {
  let minX = 180;
  let minY = 90;
  let maxX = -180;
  let maxY = -90;
  for (const feature of STADTTEILE.features) {
    for (const [x, y] of feature.geometry.coordinates[0]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
})();

export function ausschnittVon(schluessel: string): [[number, number], [number, number]] | null {
  const feature = STADTTEILE.features.find((s) => s.properties.schluessel === schluessel);
  if (!feature) return null;
  let minX = 180;
  let minY = 90;
  let maxX = -180;
  let maxY = -90;
  for (const [x, y] of feature.geometry.coordinates[0]) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}
