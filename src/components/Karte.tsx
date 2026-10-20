/**
 * Die Karte.
 *
 * Aufbau in vier Ebenen, von unten nach oben:
 *   1. Basiskarte   — CARTO Positron, Vektor-Tiles, kein API-Schlüssel
 *   2. Luftbild     — Esri World Imagery als Raster, zuschaltbar
 *   3. Teilorte     — die Ortsnamen der Basiskarte, per Schalter freigegeben
 *   4. Objekte      — eigene GeoJSON-Ebene: Punkt plus Beschriftung beim Zoomen
 *
 * Das Luftbild wird NICHT über einen Stilwechsel gelöst, sondern als Ebene
 * ein- und ausgeblendet. Ein Stilwechsel würde alle eigenen Quellen und
 * Feature-States verwerfen — Auswahl und Schweben wären jedes Mal weg.
 *
 * Statuscodierung: Ampel. Gelb = interessant, Grün = gekauft, Rot = kein Deal.
 * Innerhalb von Gelb wächst die Tiefe mit dem Fortschritt.
 */
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import {
  STUFEN,
  STUFEN_REIHENFOLGE,
  berechneKennzahlen,
  type Ankaufsstufe,
  type Objekt,
} from "../lib/objekte";
import { GESAMT_AUSSCHNITT } from "../lib/stadtteile";

const BASISKARTE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/** Luftbild. Frei nutzbar, kein Schlüssel, bis Zoom 19 scharf. */
const LUFTBILD_KACHELN = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
];

export type Kartenansicht = "karte" | "luftbild";

/** Touchgerät? Entscheidet über Trefferbereich und Schwebeverhalten. */
function grobZeiger(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

/** Schriftart der Basiskarte — andere Namen hat sie nicht im Glyph-Satz. */
const SCHRIFT = ["Open Sans Regular", "Arial Unicode MS Regular"];

/** Ab hier bekommt der Punkt seine Beschriftung — Straße und Preis. */
const ZOOM_TEXT = 14.4;

/** Kurzform des Kaufpreises für die Kartenbeschriftung. */
function preisKurz(wert: number | null): string {
  if (!wert) return "";
  if (wert >= 1_000_000) {
    return `${(wert / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Mio. €`;
  }
  return `${Math.round(wert / 1000).toLocaleString("de-DE")} Tsd. €`;
}

export interface KartenZustand {
  /** Objekt, über dem die Maus steht. */
  schweben: Objekt | null;
  /** Bildschirmposition der Schwebekarte. */
  position: { x: number; y: number } | null;
}

interface Props {
  objekte: Objekt[];
  /** Nur diese Stufen zeichnen. Leer heißt: alle. */
  stufen: Set<Ankaufsstufe>;
  /** Stadtteilflächen ein- oder ausblenden. */
  stadtteileZeigen: boolean;
  /** Plan oder Luftbild. */
  ansicht: Kartenansicht;
  gewaehltesObjekt: string | null;
  onObjektWaehlen: (id: string | null) => void;
  /** Klick auf freie Fläche schließt die Auswahl. */
  onLeerKlick: () => void;
  /** Nach außen gemeldeter Schwebe-Zustand, damit die Karte selbst kein DOM baut. */
  onSchweben: (z: KartenZustand) => void;
  /** Wird mit der Steuerung befüllt, sobald die Karte bereit ist. */
  steuerungRef?: React.RefObject<KartenSteuerung | null>;
}

export interface KartenSteuerung {
  aufAusschnitt: (grenzen: [[number, number], [number, number]], polsterung?: number) => void;
  aufObjekt: (o: Objekt) => void;
  zuruecksetzen: () => void;
}

/** GeoJSON für die Objektpunkte. */
function punkteSammlung(objekte: Objekt[]) {
  return {
    type: "FeatureCollection" as const,
    features: objekte.map((o) => ({
      type: "Feature" as const,
      id: o.id,
      properties: {
        id: o.id,
        stufe: o.stufe,
        einheiten: o.einheiten.length,
        // Objekte über dem Ankaufslimit bekommen einen Warnring. Timo sieht
        // damit auf der Karte, welche Lage interessant, aber zu teuer ist.
        zuTeuer: berechneKennzahlen(o).zuTeuer,
        // Für die Beschriftung ab ZOOM_TEXT.
        strasse: o.strasse,
        preis: preisKurz(o.kaufpreis),
      },
      geometry: { type: "Point" as const, coordinates: [o.laenge, o.breite] },
    })),
  };
}

/**
 * Start-Ausschnitt. Nicht die ganze Gemarkung — die reicht bis Eggingen und
 * Mähringen und schiebt die Stadt zu einem Punkt zusammen. Gezeigt wird, wo
 * Objekte liegen; erst ohne Objekte fällt die Karte auf die Region zurück.
 */
function ausschnittVonObjekten(
  objekte: Objekt[],
): [[number, number], [number, number]] {
  if (objekte.length === 0) return GESAMT_AUSSCHNITT;
  let minX = 180;
  let minY = 90;
  let maxX = -180;
  let maxY = -90;
  for (const o of objekte) {
    if (o.laenge < minX) minX = o.laenge;
    if (o.laenge > maxX) maxX = o.laenge;
    if (o.breite < minY) minY = o.breite;
    if (o.breite > maxY) maxY = o.breite;
  }
  // Luft drumherum, damit die äußersten Punkte nicht am Rand kleben.
  const luft = 0.012;
  return [
    [minX - luft, minY - luft],
    [maxX + luft, maxY + luft],
  ];
}

/** Farbe je Stufe als MapLibre-Ausdruck. */
function stufenFarbe(): maplibregl.ExpressionSpecification {
  const zweige = STUFEN_REIHENFOLGE.flatMap((s) => [s, STUFEN[s].farbe]);
  return ["match", ["get", "stufe"], ...zweige, "#9aa3b1"] as never;
}

/**
 * Punktgröße. Angekaufte Objekte sind der Bestand und dürfen größer sein.
 * `mal` skaliert die gesamte Kurve — so bleiben Schatten, Warnring und Punkt
 * bei jedem Zoomschritt im selben Verhältnis.
 */
function PUNKT_RADIUS(mal: number): maplibregl.ExpressionSpecification {
  const g = (angekauft: number, rest: number): maplibregl.ExpressionSpecification =>
    ["case", ["==", ["get", "stufe"], "angekauft"], angekauft * mal, rest * mal] as never;
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    9,
    g(6, 5),
    13,
    g(8, 6.5),
    17,
    g(11, 9),
  ] as never;
}

export function Karte({
  objekte,
  stufen,
  stadtteileZeigen,
  ansicht,
  gewaehltesObjekt,
  onObjektWaehlen,
  onLeerKlick,
  onSchweben,
  steuerungRef,
}: Props) {
  const behaelterRef = useRef<HTMLDivElement>(null);
  const karteRef = useRef<maplibregl.Map | null>(null);
  const [bereit, setBereit] = useState(false);

  // Props, die Event-Handler brauchen, über Refs — sonst müssten die Listener
  // bei jedem Render neu gebunden werden.
  const objekteRef = useRef(objekte);
  objekteRef.current = objekte;
  const rueckrufRef = useRef({ onObjektWaehlen, onLeerKlick, onSchweben });
  rueckrufRef.current = { onObjektWaehlen, onLeerKlick, onSchweben };

  /** Beschriftungsebenen der Basiskarte mit ihren Originalfarben. */
  const basisSchriftRef = useRef<{ id: string; farbe: unknown; halo: unknown }[]>([]);
  /** Kleine Ortsnamen der Basiskarte (Grimmelfingen, Wiblingen …). */
  const kleineOrteRef = useRef<string[]>([]);

  /* ---------------------------------------------------------------- */
  /* Karte aufbauen — genau einmal                                     */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!behaelterRef.current) return;

    const karte = new maplibregl.Map({
      container: behaelterRef.current,
      style: BASISKARTE,
      bounds: ausschnittVonObjekten(objekteRef.current),
      fitBoundsOptions: { padding: 56, maxZoom: 14 },
      attributionControl: { compact: true },
      // Die Karte ist ein Werkzeug, keine Show. Keine schrägen Ansichten.
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: true,
    });
    karteRef.current = karte;

    karte.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    karte.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    karte.on("load", () => {
      /* ----- Luftbild ----- */
      // Positron trägt seine Beschriftung ganz oben. Das Luftbild schiebt sich
      // darunter — dadurch benutzen Plan und Foto dieselbe Typografie, statt
      // dass eine fremde Rasterschrift dazukommt. Die Originalfarben werden
      // gemerkt, weil die Schrift auf dem Foto hell werden muss.
      // Positron streut einzelne Symbolebenen (Hausnummern) schon zwischen die
      // Flächen. Entscheidend ist die letzte Nicht-Symbolebene: alles danach
      // ist reine Beschriftung und darf über dem Foto bleiben.
      const ebenen = karte.getStyle().layers;
      let letzteFlaeche = -1;
      ebenen.forEach((l, i) => {
        if (l.type !== "symbol") letzteFlaeche = i;
      });
      const schriftAbHier = ebenen.slice(letzteFlaeche + 1);
      basisSchriftRef.current = schriftAbHier.map((l) => ({
        id: l.id,
        farbe: karte.getPaintProperty(l.id, "text-color"),
        halo: karte.getPaintProperty(l.id, "text-halo-color"),
      }));

      // Kleine Ortsnamen (Dörfer, Weiler, Vororte wie Grimmelfingen) ruhen
      // standardmäßig — nur Ulm und Neu-Ulm tragen die Orientierung. Der
      // Teilorte-Schalter blendet sie gemeinsam mit unseren Stadtteilnamen ein.
      kleineOrteRef.current = ebenen
        .filter(
          (l) =>
            l.type === "symbol" &&
            l.id.includes("place") &&
            !/city|town|capital|country|state|continent/.test(l.id),
        )
        .map((l) => l.id);
      for (const id of kleineOrteRef.current) {
        karte.setLayoutProperty(id, "visibility", "none");
      }

      karte.addSource("luftbild", {
        type: "raster",
        tiles: LUFTBILD_KACHELN,
        tileSize: 256,
        maxzoom: 19,
        attribution: "Luftbild: Esri, Maxar, Earthstar Geographics",
      });
      karte.addLayer(
        {
          id: "luftbild-foto",
          type: "raster",
          source: "luftbild",
          layout: { visibility: "none" },
          paint: {
            // Leicht entsättigt und abgedunkelt, damit die Ampelpunkte darauf
            // nicht mit dem bunten Foto konkurrieren.
            "raster-saturation": -0.25,
            "raster-brightness-max": 0.92,
            "raster-opacity": 0,
            "raster-opacity-transition": { duration: 280, delay: 0 },
          },
        },
        schriftAbHier[0]?.id,
      );

      /* ----- Objektpunkte ----- */
      // promoteId macht die Objekt-ID zur Feature-ID — Voraussetzung dafür,
      // dass Schweben und Auswahl über setFeatureState laufen können.
      karte.addSource("objekte", {
        type: "geojson",
        data: punkteSammlung(objekteRef.current),
        promoteId: "id",
      });

      // Weicher Schatten unter jedem Punkt. Auf dem Luftbild ist das der
      // Unterschied zwischen „schwebt über der Karte“ und „geht unter“.
      karte.addLayer({
        id: "objekt-schatten",
        type: "circle",
        source: "objekte",
        paint: {
          "circle-radius": PUNKT_RADIUS(1.55),
          "circle-color": "#10131a",
          "circle-opacity": 0.16,
          "circle-blur": 0.9,
          "circle-translate": [0, 1],
        },
      });

      // Auswahlring: eigene Ebene, damit er unter dem Punkt liegt und
      // unabhängig animiert werden kann.
      karte.addLayer({
        id: "objekt-ring",
        type: "circle",
        source: "objekte",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "gewaehlt"], false],
            18,
            ["boolean", ["feature-state", "schweben"], false],
            14,
            0,
          ],
          "circle-color": stufenFarbe(),
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "gewaehlt"], false],
            0.16,
            ["boolean", ["feature-state", "schweben"], false],
            0.12,
            0,
          ],
          "circle-stroke-color": stufenFarbe(),
          "circle-stroke-width": 1.5,
          "circle-stroke-opacity": [
            "case",
            ["boolean", ["feature-state", "gewaehlt"], false],
            0.9,
            ["boolean", ["feature-state", "schweben"], false],
            0.5,
            0,
          ],
          "circle-radius-transition": { duration: 180, delay: 0 },
          "circle-opacity-transition": { duration: 180, delay: 0 },
          "circle-stroke-opacity-transition": { duration: 180, delay: 0 },
        },
      });

      // Warnring für Objekte über dem Ankaufslimit — interessant, aber zu teuer.
      karte.addLayer({
        id: "objekt-warnung",
        type: "circle",
        source: "objekte",
        filter: ["==", ["get", "zuTeuer"], true],
        paint: {
          "circle-radius": PUNKT_RADIUS(1.9),
          "circle-color": "transparent",
          "circle-stroke-color": "#CF4848",
          "circle-stroke-width": 1.4,
          "circle-stroke-opacity": 0.75,
        },
      });

      karte.addLayer({
        id: "objekt-punkt",
        type: "circle",
        source: "objekte",
        paint: {
          "circle-radius": PUNKT_RADIUS(1),
          "circle-color": stufenFarbe(),
          // Abgesagte Objekte bleiben sichtbar, treten aber zurück.
          "circle-opacity": ["case", ["==", ["get", "stufe"], "abgesagt"], 0.75, 1],
          // Der weiße Ring trennt den Punkt sauber vom Untergrund — auf dem
          // Plan wie auf dem Luftbild.
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "gewaehlt"], false],
            2.4,
            1.6,
          ],
          "circle-stroke-opacity": 1,
          "circle-stroke-width-transition": { duration: 160, delay: 0 },
        },
      });

      // Beim Reinzoomen bekommt der Punkt seinen Namen: Straße und Preis.
      // Ersetzt den alten Mock-Gebäudeumriss — der war ein künstliches
      // Rechteck und passte auf dem Luftbild nie aufs echte Gebäude.
      karte.addLayer({
        id: "objekt-text",
        type: "symbol",
        source: "objekte",
        minzoom: ZOOM_TEXT,
        layout: {
          "text-field": [
            "format",
            ["get", "strasse"],
            {},
            "\n",
            {},
            ["get", "preis"],
            { "font-scale": 0.85 },
          ],
          "text-font": SCHRIFT,
          "text-size": ["interpolate", ["linear"], ["zoom"], ZOOM_TEXT, 10.5, 17, 13],
          "text-anchor": "top",
          "text-offset": [0, 1],
          "text-padding": 4,
          "text-line-height": 1.25,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#10131a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
          // Weich einblenden statt hart ab Mindest-Zoom aufzutauchen.
          "text-opacity": ["interpolate", ["linear"], ["zoom"], ZOOM_TEXT, 0, ZOOM_TEXT + 0.6, 1],
        },
      });

      setBereit(true);
    });

    /* ----- Zeiger und Schweben ----- */
    let schwebendeId: string | null = null;

    const setSchweben = (id: string | null, punkt?: { x: number; y: number }) => {
      if (schwebendeId === id) {
        if (id && punkt) {
          const o = objekteRef.current.find((x) => x.id === id);
          if (o) rueckrufRef.current.onSchweben({ schweben: o, position: punkt });
        }
        return;
      }
      if (schwebendeId) {
        karte.setFeatureState({ source: "objekte", id: schwebendeId }, { schweben: false });
      }
      schwebendeId = id;
      if (id) {
        karte.setFeatureState({ source: "objekte", id }, { schweben: true });
        const o = objekteRef.current.find((x) => x.id === id);
        rueckrufRef.current.onSchweben({ schweben: o ?? null, position: punkt ?? null });
      } else {
        rueckrufRef.current.onSchweben({ schweben: null, position: null });
      }
    };

    /**
     * Trefferbereich. Der Finger ist ungenauer als die Maus — am Touchgerät
     * braucht ein 7-Pixel-Punkt rund 22 Pixel Toleranz, sonst trifft man nie.
     */
    const treffenBei = (punkt: maplibregl.Point) => {
      const t = grobZeiger() ? 22 : 8;
      return karte.queryRenderedFeatures(
        [
          [punkt.x - t, punkt.y - t],
          [punkt.x + t, punkt.y + t],
        ],
        { layers: ["objekt-punkt"] },
      );
    };

    const beiMausBewegung = (e: maplibregl.MapMouseEvent) => {
      if (!karte.getLayer("objekt-punkt")) return;
      // Am Touchgerät gibt es kein echtes Schweben. Ohne diese Sperre bliebe
      // nach jedem Tippen eine Karte hängen, die niemand wieder wegbekommt.
      if (grobZeiger()) return;
      const id = treffenBei(e.point)[0]?.properties?.id as string | undefined;
      karte.getCanvas().style.cursor = id ? "pointer" : "";
      setSchweben(id ?? null, { x: e.point.x, y: e.point.y });
    };

    const beiVerlassen = () => {
      karte.getCanvas().style.cursor = "";
      setSchweben(null);
    };

    const beiKlick = (e: maplibregl.MapMouseEvent) => {
      if (!karte.getLayer("objekt-punkt")) return;
      const id = treffenBei(e.point)[0]?.properties?.id as string | undefined;
      if (id) {
        rueckrufRef.current.onObjektWaehlen(id);
      } else {
        rueckrufRef.current.onLeerKlick();
      }
    };

    karte.on("mousemove", beiMausBewegung);
    karte.on("mouseout", beiVerlassen);
    karte.on("dragstart", beiVerlassen);
    karte.on("click", beiKlick);

    return () => {
      karte.remove();
      karteRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Daten nachziehen                                                  */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const karte = karteRef.current;
    if (!karte || !bereit) return;

    const sichtbar =
      stufen.size === 0 ? objekte : objekte.filter((o) => stufen.has(o.stufe));

    (karte.getSource("objekte") as maplibregl.GeoJSONSource).setData(punkteSammlung(sichtbar));
  }, [objekte, stufen, bereit]);

  /* ---------------------------------------------------------------- */
  /* Plan oder Luftbild                                                */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const karte = karteRef.current;
    if (!karte || !bereit) return;
    const an = ansicht === "luftbild";

    // Erst sichtbar schalten, dann einblenden — sonst springt das Bild herein.
    if (an) karte.setLayoutProperty("luftbild-foto", "visibility", "visible");
    karte.setPaintProperty("luftbild-foto", "raster-opacity", an ? 1 : 0);

    // Die Beschriftung der Basiskarte liegt über dem Foto und muss dort hell
    // werden, sonst verschwindet sie in den dunklen Dächern.
    for (const ebene of basisSchriftRef.current) {
      karte.setPaintProperty(ebene.id, "text-color", an ? "#ffffff" : ebene.farbe);
      karte.setPaintProperty(
        ebene.id,
        "text-halo-color",
        an ? "rgba(12, 15, 20, 0.9)" : ebene.halo,
      );
    }

    // Die Objektbeschriftung steht auf dem Foto in Weiß, auf dem Plan in Tinte.
    karte.setPaintProperty("objekt-text", "text-color", an ? "#ffffff" : "#10131a");
    karte.setPaintProperty(
      "objekt-text",
      "text-halo-color",
      an ? "rgba(12, 15, 20, 0.85)" : "#ffffff",
    );

    if (an) return;
    // Nach dem Ausblenden abschalten, damit keine Kacheln mehr nachgeladen werden.
    const aus = window.setTimeout(() => {
      if (!karteRef.current?.getLayer("luftbild-foto")) return;
      karteRef.current.setLayoutProperty("luftbild-foto", "visibility", "none");
    }, 320);
    return () => window.clearTimeout(aus);
  }, [ansicht, bereit]);

  /* ---------------------------------------------------------------- */
  /* Teilortnamen ein- und ausblenden                                  */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const karte = karteRef.current;
    if (!karte || !bereit) return;

    // Keine eigene Label-Ebene: die Basiskarte kennt die Teilorte selbst und
    // setzt die Namen an die richtige Stelle — wir schalten sie nur frei.
    for (const id of kleineOrteRef.current) {
      karte.setLayoutProperty(id, "visibility", stadtteileZeigen ? "visible" : "none");
    }
  }, [stadtteileZeigen, bereit]);

  /* ---------------------------------------------------------------- */
  /* Auswahl                                                           */
  /* ---------------------------------------------------------------- */
  const vorherGewaehlt = useRef<string | null>(null);
  useEffect(() => {
    const karte = karteRef.current;
    if (!karte || !bereit) return;

    if (vorherGewaehlt.current) {
      karte.setFeatureState(
        { source: "objekte", id: vorherGewaehlt.current },
        { gewaehlt: false },
      );
    }
    vorherGewaehlt.current = gewaehltesObjekt;
    if (gewaehltesObjekt) {
      karte.setFeatureState({ source: "objekte", id: gewaehltesObjekt }, { gewaehlt: true });
    }
  }, [gewaehltesObjekt, bereit]);

  /* ---------------------------------------------------------------- */
  /* Steuerung nach außen                                              */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!steuerungRef) return;
    // Auf dem Telefon deckt das Blatt die untere Hälfte ab — das Objekt muss
    // deshalb in die obere Hälfte wandern, sonst zoomt die Karte darunter.
    const polsterUnten = () => (window.innerWidth < 768 ? Math.round(window.innerHeight * 0.42) : 56);

    steuerungRef.current = {
      aufAusschnitt: (grenzen, polsterung = 64) =>
        karteRef.current?.fitBounds(grenzen, {
          padding: { top: polsterung, right: polsterung, bottom: polsterUnten(), left: polsterung },
          duration: 700,
        }),
      aufObjekt: (o) =>
        karteRef.current?.easeTo({
          center: [o.laenge, o.breite],
          zoom: 16.6,
          offset: [0, window.innerWidth < 768 ? -Math.round(window.innerHeight * 0.18) : 0],
          duration: 700,
        }),
      zuruecksetzen: () =>
        karteRef.current?.fitBounds(ausschnittVonObjekten(objekteRef.current), {
          padding: { top: 56, right: 56, bottom: polsterUnten(), left: 56 },
          maxZoom: 14,
          duration: 700,
        }),
    };
  }, [steuerungRef, bereit]);

  return <div ref={behaelterRef} className="absolute inset-0" />;
}
