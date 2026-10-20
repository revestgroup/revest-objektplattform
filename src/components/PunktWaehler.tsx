/**
 * PunktWähler — die Koordinate wird gesetzt, nicht getippt.
 *
 * Sobald die Adresse vollständig ist, setzt das Geocoding (Nominatim/OSM)
 * den Punkt automatisch — mit Hausnummer meist aufs Gebäude genau. Wer es
 * präziser will, klappt die Minikarte auf und zieht den Marker oder tippt
 * die Stelle an. Ein von Hand gesetzter Punkt wird nie wieder automatisch
 * überschrieben. Längen- und Breitengrad tauchen nirgends als Zahl auf —
 * Stadt und Stadtteil leitet das Formular selbst aus dem Punkt ab.
 */
import maplibregl from "maplibre-gl";
import { LoaderCircle, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { stadtteilAnPunkt } from "../lib/stadtteile";
import { cn } from "../lib/utils";

const BASISKARTE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/** Startblick zwischen Ulm und Neu-Ulm, wenn noch kein Punkt existiert. */
const START: [number, number] = [9.995, 48.398];

/** Adresse → Koordinate über Nominatim (OSM). Kostenlos, kein Schlüssel. */
async function geocode(
  adresse: { strasse: string; plz: string; stadt: string },
  signal: AbortSignal,
): Promise<[number, number] | null> {
  const antwort = await fetch(
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de" +
      `&street=${encodeURIComponent(adresse.strasse)}` +
      `&postalcode=${encodeURIComponent(adresse.plz)}` +
      `&city=${encodeURIComponent(adresse.stadt)}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!antwort.ok) return null;
  const treffer = (await antwort.json()) as { lon: string; lat: string }[];
  if (!treffer[0]) return null;
  return [Number.parseFloat(treffer[0].lon), Number.parseFloat(treffer[0].lat)];
}

export function PunktWaehler({
  laenge,
  breite,
  adresse,
  onSetzen,
  fehler,
}: {
  laenge: number | null;
  breite: number | null;
  /** Vollständige Adresse fürs Geocoding — null, solange sie unvollständig ist. */
  adresse: { strasse: string; plz: string; stadt: string } | null;
  /** Neue Stelle — vom Geocoding, Klick auf die Minikarte oder Ziehen des Markers. */
  onSetzen: (laenge: number, breite: number) => void;
  fehler?: string;
}) {
  const gesetzt = laenge !== null && breite !== null;
  // Ohne Punkt sofort offen — er ist Pflicht. Mit Punkt (Bearbeiten) reicht
  // die Zusammenfassung, die Karte kommt auf Wunsch.
  const [offen, setOffen] = useState(!gesetzt);

  const behaelterRef = useRef<HTMLDivElement>(null);
  const karteRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onSetzenRef = useRef(onSetzen);
  onSetzenRef.current = onSetzen;

  // Von Hand gesetzt schlägt Automatik: danach fasst das Geocoding den
  // Punkt nicht mehr an. Beim Bearbeiten gilt der Bestandspunkt als manuell.
  const manuellRef = useRef(gesetzt);
  const [suche, setSuche] = useState<"ruht" | "laeuft" | "gefunden" | "nichts">("ruht");

  const treffer = gesetzt ? stadtteilAnPunkt(laenge, breite) : null;

  /* Automatik: vollständige Adresse → Punkt. Kurz entprellt, damit nicht
     jeder Tastendruck eine Anfrage auslöst. */
  const adresseSchluessel = adresse
    ? `${adresse.strasse}|${adresse.plz}|${adresse.stadt}`
    : null;
  useEffect(() => {
    if (!adresseSchluessel || manuellRef.current) return;
    const [strasse, plz, stadt] = adresseSchluessel.split("|");
    const abbruch = new AbortController();
    setSuche("laeuft");
    const t = setTimeout(async () => {
      try {
        const punkt = await geocode({ strasse, plz, stadt }, abbruch.signal);
        if (abbruch.signal.aborted) return;
        if (!punkt) {
          setSuche("nichts");
          return;
        }
        setSuche("gefunden");
        onSetzenRef.current(punkt[0], punkt[1]);
        markerRef.current?.setLngLat(punkt);
        if (karteRef.current) {
          markerRef.current?.addTo(karteRef.current);
          karteRef.current.flyTo({ center: punkt, zoom: 16.2, duration: 600 });
        }
      } catch {
        if (!abbruch.signal.aborted) setSuche("nichts");
      }
    }, 700);
    return () => {
      clearTimeout(t);
      abbruch.abort();
    };
  }, [adresseSchluessel]);

  /* Karte erst bauen, wenn sie sichtbar wird. */
  useEffect(() => {
    if (!offen || !behaelterRef.current || karteRef.current) return;

    const start: [number, number] =
      laenge !== null && breite !== null ? [laenge, breite] : START;

    const karte = new maplibregl.Map({
      container: behaelterRef.current,
      style: BASISKARTE,
      center: start,
      zoom: laenge !== null ? 15.4 : 12,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
    });
    karteRef.current = karte;
    karte.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    karte.getCanvas().style.cursor = "crosshair";

    const marker = new maplibregl.Marker({ color: "#10131a", draggable: true });
    markerRef.current = marker;
    if (laenge !== null && breite !== null) marker.setLngLat([laenge, breite]).addTo(karte);

    marker.on("dragend", () => {
      manuellRef.current = true;
      const p = marker.getLngLat();
      onSetzenRef.current(p.lng, p.lat);
    });
    karte.on("click", (e) => {
      manuellRef.current = true;
      marker.setLngLat(e.lngLat).addTo(karte);
      onSetzenRef.current(e.lngLat.lng, e.lngLat.lat);
    });

    return () => {
      karte.remove();
      karteRef.current = null;
      markerRef.current = null;
    };
    // Bewusst nur an `offen` gebunden: Start-Koordinate ist eine Momentaufnahme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen]);

  return (
    <div className="sm:col-span-2">
      <span className="mini-label block">
        Lage auf der Karte<span className="ml-1 text-grau-stark">*</span>
      </span>

      <div
        className={cn(
          "mt-2 overflow-hidden rounded-xl border bg-flaeche",
          fehler ? "border-grau-stark" : "border-linie",
        )}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              gesetzt ? "bg-tinte text-grund" : "bg-flaeche-hoch text-grau",
            )}
          >
            {suche === "laeuft" ? (
              <LoaderCircle size={15} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <MapPin size={15} strokeWidth={1.75} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.78rem] text-tinte">
              {suche === "laeuft"
                ? "Adresse wird gesucht …"
                : gesetzt
                  ? treffer
                    ? `${treffer.name}, ${treffer.stadt}`
                    : "Punkt gesetzt"
                  : "Noch kein Punkt gesetzt"}
            </span>
            <span className="block truncate text-[0.64rem] text-grau">
              {suche === "nichts" && !gesetzt
                ? "Adresse nicht gefunden — Punkt von Hand setzen."
                : suche === "gefunden"
                  ? "Automatisch aus der Adresse gesetzt — zum Feinjustieren Marker ziehen."
                  : offen
                    ? "Stelle antippen oder Marker ziehen — Stadt und Stadtteil folgen automatisch."
                    : "Der Punkt wird automatisch aus der Adresse bestimmt."}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setOffen((a) => !a)}
            className="druckbar shrink-0 rounded-full border border-linie px-3 py-1.5 text-[0.62rem] font-semibold tracking-[0.12em] uppercase text-grau-stark hover:text-tinte"
          >
            {offen ? "Zuklappen" : gesetzt ? "Punkt anpassen" : "Punkt setzen"}
          </button>
        </div>

        {offen && (
          <div className="eintritt relative h-64 border-t border-linie">
            <div ref={behaelterRef} className="absolute inset-0" />
          </div>
        )}
      </div>

      {fehler && <p className="mt-1.5 text-[0.65rem] text-tinte">{fehler}</p>}
    </div>
  );
}
