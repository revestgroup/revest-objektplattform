/**
 * Supabase-Client und Verbindungsprüfung (Phase 2, S1).
 *
 * Nur die Datenschicht unter `src/lib/db/` spricht mit Supabase — Komponenten
 * und Speicher (`…Store.tsx`) rufen ab S4 die Schnittstellen dieser Schicht
 * auf, nie den Client direkt. Solange `VITE_DATENQUELLE` nicht `supabase` ist,
 * wird kein Client erzeugt.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { datenquelleLesen, supabaseKonfig, type SupabaseKonfig } from "./konfig";

export const DATENQUELLE = datenquelleLesen(import.meta.env.VITE_DATENQUELLE);

const KONFIG = supabaseKonfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

let client: SupabaseClient | null = null;

/** Der Client — wirft mit verständlicher Meldung, wenn er nicht genutzt werden darf. */
export function supabase(): SupabaseClient {
  if (DATENQUELLE !== "supabase")
    throw new Error("Datenquelle ist „local“ — Supabase ist nicht eingeschaltet.");
  if (!KONFIG.ok) throw new Error(KONFIG.fehler);
  client ??= createClient(KONFIG.konfig.url, KONFIG.konfig.schluessel, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

export function supabaseKonfiguration(): SupabaseKonfig | null {
  return KONFIG.ok ? KONFIG.konfig : null;
}

export type Verbindung =
  | { stand: "lokal" }
  | { stand: "fehlt"; fehler: string }
  | { stand: "ok"; projekt: string | null }
  | { stand: "fehler"; fehler: string };

/**
 * Erreicht die App den Supabase-Dienst? Fragt den Gesundheits-Endpunkt der
 * Anmeldung ab — braucht keine Tabelle und liest keine Daten.
 */
export async function verbindungPruefen(): Promise<Verbindung> {
  if (DATENQUELLE !== "supabase") return { stand: "lokal" };
  if (!KONFIG.ok) return { stand: "fehlt", fehler: KONFIG.fehler };
  try {
    const antwort = await fetch(`${KONFIG.konfig.url}/auth/v1/health`, {
      headers: { apikey: KONFIG.konfig.schluessel },
    });
    if (!antwort.ok) return { stand: "fehler", fehler: `Antwort ${antwort.status}` };
    return { stand: "ok", projekt: KONFIG.konfig.projekt };
  } catch (e) {
    return { stand: "fehler", fehler: e instanceof Error ? e.message : "nicht erreichbar" };
  }
}
