/**
 * Adresssuche über Nominatim (OpenStreetMap) — genutzt vom Punktwähler im
 * Formular und vom Ankauf-Eingang.
 */

/** Adresse → Koordinate über Nominatim (OSM). Kostenlos, kein Schlüssel. */
export async function geocode(
  adresse: { strasse: string; plz: string; stadt: string },
  signal?: AbortSignal,
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
