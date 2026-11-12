import { describe, expect, test } from "bun:test";

import { datenquelleLesen, supabaseKonfig } from "./konfig";
import { zeileAusDb, zeileZuDb, zuCamel, zuSnake } from "./umwandeln";

/** Erfundener JWT mit gegebener Rolle — keine echte Signatur. */
const jwt = (rolle: string) =>
  `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ role: rolle })).replace(/=+$/, "")}.x`;

describe("Datenquelle", () => {
  test("Standard ist lokal", () => {
    expect(datenquelleLesen(undefined)).toBe("local");
    expect(datenquelleLesen("")).toBe("local");
    expect(datenquelleLesen("local")).toBe("local");
    expect(datenquelleLesen(" Supabase ")).toBe("supabase");
  });
});

describe("Supabase-Konfiguration", () => {
  const url = "https://abcdefghijklmnopqrst.supabase.co/";

  test("öffentlicher Schlüssel wird angenommen, Projekt aus der URL", () => {
    const k = supabaseKonfig(url, jwt("anon"));
    expect(k.ok).toBe(true);
    if (k.ok) {
      expect(k.konfig.url).toBe("https://abcdefghijklmnopqrst.supabase.co");
      expect(k.konfig.projekt).toBe("abcdefghijklmnopqrst");
    }
    expect(supabaseKonfig(url, "sb_publishable_test").ok).toBe(true);
  });

  test("geheimer Schlüssel wird abgewiesen", () => {
    const a = supabaseKonfig(url, jwt("service_role"));
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.fehler).toContain("service_role");
    expect(supabaseKonfig(url, "sb_secret_test").ok).toBe(false);
  });

  test("fehlende oder unsichere Angaben", () => {
    expect(supabaseKonfig("", "x").ok).toBe(false);
    expect(supabaseKonfig(url, "").ok).toBe(false);
    expect(supabaseKonfig("http://abc.supabase.co", "x").ok).toBe(false);
    expect(supabaseKonfig("kein url", "x").ok).toBe(false);
    expect(supabaseKonfig("http://127.0.0.1:54321", "x").ok).toBe(true);
  });
});

describe("Spaltennamen", () => {
  test("camelCase ↔ snake_case, nur oberste Ebene", () => {
    expect(zuSnake("objektId")).toBe("objekt_id");
    expect(zuSnake("zeitblockVon")).toBe("zeitblock_von");
    expect(zuCamel("geaendert_am")).toBe("geaendertAm");
    expect(zeileZuDb({ objektId: "o1", leer: undefined, pruefung: { innenFeld: 1 } })).toEqual({
      objekt_id: "o1",
      pruefung: { innenFeld: 1 },
    });
    expect(zeileAusDb<{ erstelltAm: string }>({ erstellt_am: "2026-11-12" }).erstelltAm).toBe(
      "2026-11-12",
    );
  });
});
