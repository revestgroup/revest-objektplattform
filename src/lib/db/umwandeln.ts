/**
 * Spaltennamen: in der Datenbank snake_case (`objekt_id`), im Code camelCase
 * (`objektId`). Umgewandelt wird nur die oberste Ebene einer Zeile — der
 * Inhalt von jsonb-Spalten (Prüfung, Kalkulation …) bleibt, wie er ist.
 */

export function zuSnake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function zuCamel(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_, z: string) => z.toUpperCase());
}

/** Code → Datenbank. `undefined` fällt weg, damit ein Teil-Update nichts überschreibt. */
export function zeileZuDb(objekt: Record<string, unknown>): Record<string, unknown> {
  const aus: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(objekt)) if (v !== undefined) aus[zuSnake(k)] = v;
  return aus;
}

/** Datenbank → Code. */
export function zeileAusDb<T>(zeile: Record<string, unknown>): T {
  const aus: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(zeile)) aus[zuCamel(k)] = v;
  return aus as T;
}
