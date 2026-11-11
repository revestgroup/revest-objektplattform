import { describe, expect, test } from "bun:test";

import {
  MAILVORLAGEN,
  antwortBetreff,
  fremdesKuerzel,
  kategorieVon,
  mitKuerzel,
  nachMonaten,
  telefonatText,
  terminText,
} from "./aktivitaeten";
import { MOCK_OBJEKTE } from "./mockDaten";
import type { Verlaufseintrag } from "./objekte";

const v = (id: string, zeitpunkt: string, teil: Partial<Verlaufseintrag>): Verlaufseintrag => ({
  id,
  zeitpunkt,
  text: "x",
  art: "notiz",
  ...teil,
});

describe("Mail & Aktivitäten", () => {
  const liste = [
    v("a", "2026-10-03T10:00:00Z", { art: "status", text: "Stufe: Neu" }),
    v("b", "2026-11-02T10:00:00Z", {
      art: "mail",
      mail: { richtung: "ein", von: "x", an: null, betreff: "B", text: "t" },
    }),
    v("c", "2026-11-05T10:00:00Z", { art: "telefonat", text: "Telefonat" }),
    v("d", "2026-11-04T10:00:00Z", { art: "notiz", vonHand: true }),
    v("e", "2026-11-04T09:00:00Z", {
      art: "notiz",
      vonHand: false,
      text: "Objektdaten bearbeitet",
    }),
  ];

  test("nach Monaten, neueste oben", () => {
    const g = nachMonaten(liste);
    expect(g.map((x) => x.titel)).toEqual(["November 2026", "Oktober 2026"]);
    expect(g[0].eintraege.map((e) => e.id)).toEqual(["c", "d", "e", "b"]);
  });

  test("Filter", () => {
    expect(kategorieVon(liste[4])).toBe("system");
    expect(
      nachMonaten(liste, "mail")
        .flatMap((g) => g.eintraege)
        .map((e) => e.id),
    ).toEqual(["b"]);
    expect(
      nachMonaten(liste, "notiz")
        .flatMap((g) => g.eintraege)
        .map((e) => e.id),
    ).toEqual(["d"]);
    expect(
      nachMonaten(liste, "system")
        .flatMap((g) => g.eintraege)
        .map((e) => e.id),
    ).toEqual(["e", "a"]);
  });

  test("Kürzel im Betreff, Antwort mit Re:", () => {
    expect(mitKuerzel("Besichtigung", "REB9")).toBe("[REB9] Besichtigung");
    expect(mitKuerzel("[REB9] Besichtigung", "REB9")).toBe("[REB9] Besichtigung");
    expect(antwortBetreff("Exposé Rebhangweg", "REB9")).toBe("[REB9] Re: Exposé Rebhangweg");
    expect(antwortBetreff("AW: [REB9] Unterlagen", "REB9")).toBe("AW: [REB9] Unterlagen");
    expect(fremdesKuerzel("[FAH6] Rechnung", "REB9")).toBe("FAH6");
    expect(fremdesKuerzel("[REB9] Rechnung", "REB9")).toBeNull();
  });

  test("Vorlagen", () => {
    const o = MOCK_OBJEKTE.find((x) => x.id === "obj-011")!;
    const absage = MAILVORLAGEN.find((x) => x.id === "absage")!;
    expect(absage.text(o, "Guten Tag Herr Ostermann,", "Timo Birk")).toContain(
      "Rebhangweg 9, 89075 Ulm",
    );
    expect(MAILVORLAGEN.find((x) => x.id === "unterlagen")!.text(o, "", "Timo Birk")).toContain(
      "- ",
    );
  });

  test("Texte für Telefonat und Termin", () => {
    expect(telefonatText({ mit: "Herr Ostermann", ergebnis: "schickt TE" })).toBe(
      "Telefonat mit Herr Ostermann: schickt TE",
    );
    expect(
      terminText({ art: "Besichtigung", datum: "2026-11-20", uhrzeit: "14:00", ort: null }),
    ).toBe("Besichtigung am 20.11.2026 um 14:00");
  });
});
