/**
 * Datenquelle und Supabase-Konfiguration (Phase 2, S1) — reine Funktionen,
 * ohne `import.meta.env`, damit sie testbar sind.
 *
 * `VITE_DATENQUELLE=local` (Standard) lässt die App wie bisher im Browser
 * laufen; `supabase` schaltet auf die Datenbank. Im Frontend darf nur der
 * öffentliche Schlüssel (anon bzw. `sb_publishable_…`) stehen — ein
 * `service_role`- oder `sb_secret_…`-Schlüssel wird abgewiesen.
 */

export type Datenquelle = "local" | "supabase";

export function datenquelleLesen(roh: string | undefined | null): Datenquelle {
  return roh?.trim().toLowerCase() === "supabase" ? "supabase" : "local";
}

export interface SupabaseKonfig {
  url: string;
  schluessel: string;
  /** Projekt-Referenz aus der URL (`<ref>.supabase.co`), für die Anzeige. */
  projekt: string | null;
}

/** Rolle aus einem JWT-Schlüssel lesen, ohne ihn zu prüfen — nur zur Abwehr. */
function jwtRolle(schluessel: string): string | null {
  const teile = schluessel.split(".");
  if (teile.length !== 3) return null;
  try {
    const roh = teile[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(roh + "=".repeat((4 - (roh.length % 4)) % 4))) as {
      role?: unknown;
    };
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

export function supabaseKonfig(
  url: string | undefined | null,
  schluessel: string | undefined | null,
): { ok: true; konfig: SupabaseKonfig } | { ok: false; fehler: string } {
  const u = (url ?? "").trim().replace(/\/+$/, "");
  const s = (schluessel ?? "").trim();
  if (!u || !s)
    return {
      ok: false,
      fehler: "VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt in .env.local.",
    };
  let host: string;
  try {
    const p = new URL(u);
    if (p.protocol !== "https:" && p.hostname !== "127.0.0.1" && p.hostname !== "localhost")
      return { ok: false, fehler: "VITE_SUPABASE_URL muss mit https:// beginnen." };
    host = p.hostname;
  } catch {
    return { ok: false, fehler: "VITE_SUPABASE_URL ist keine gültige Adresse." };
  }
  if (s.startsWith("sb_secret_") || jwtRolle(s) === "service_role")
    return {
      ok: false,
      fehler:
        "In VITE_SUPABASE_ANON_KEY steht ein geheimer Schlüssel (service_role). Der gehört nie ins Frontend — bitte den öffentlichen anon- bzw. publishable-Schlüssel eintragen.",
    };
  const ref = /^([a-z0-9]{20})\.supabase\.co$/.exec(host)?.[1] ?? null;
  return { ok: true, konfig: { url: u, schluessel: s, projekt: ref } };
}
