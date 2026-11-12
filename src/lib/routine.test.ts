import { describe, expect, test } from "bun:test";

import type { Backofficekarte } from "./backoffice";
import { absenderLesen, antwortAdresse, vorschlagFuer, type Posteingangsmail } from "./posteingang";
import {
  STANDARD_ROUTINEN,
  abgehakt,
  karteErledigtAm,
  stundenText,
  wochenzeit,
  zeitposten,
  type Routinehaken,
} from "./routine";

const heute = new Date(2026, 10, 12, 10); // Do 12.11.2026

describe("Routine", () => {
  test("Standardliste aus SAMMLUNG 10, Minuten gesetzt", () => {
    expect(STANDARD_ROUTINEN.tag).toHaveLength(7);
    expect(STANDARD_ROUTINEN.tag.reduce((s, p) => s + p.minuten, 0)).toBe(110);
    expect(STANDARD_ROUTINEN.woche[0].wochentag).toBe(4);
  });

  test("Tagesroutine täglich frisch, Wochenroutine gilt die ganze Woche", () => {
    const h: Routinehaken[] = [
      { punktId: "a", datum: "2026-11-11", minuten: 10, kategorie: "X" },
      { punktId: "w", datum: "2026-11-09", minuten: 120, kategorie: "Y" },
    ];
    expect(abgehakt(h, "a", "tag", heute)).toBeUndefined();
    expect(abgehakt(h, "a", "tag", new Date(2026, 10, 11))).toBeDefined();
    expect(abgehakt(h, "w", "woche", heute)).toBeDefined();
    expect(abgehakt(h, "w", "woche", new Date(2026, 10, 16))).toBeUndefined();
  });
});

describe("Zeit Backoffice", () => {
  const karte = (teil: Partial<Backofficekarte>): Backofficekarte => ({
    id: "k",
    titel: "K",
    spalte: "posteingang",
    art: "rechnung",
    quelle: "hand",
    eingangAm: "2026-11-10T08:00:00Z",
    datei: null,
    objektId: null,
    gesellschaft: null,
    faelligAm: null,
    notizen: null,
    checkliste: [],
    zugewiesen: null,
    uebergabe: null,
    verlauf: [],
    ...teil,
  });

  test("Karte zählt ab Archiv, Weiterleitung oder Spalte Erledigt", () => {
    expect(karteErledigtAm(karte({}))).toBeNull();
    expect(karteErledigtAm(karte({ archiviertAm: "2026-11-11T09:00:00Z" }))).toBe(
      "2026-11-11T09:00:00Z",
    );
    expect(
      karteErledigtAm(
        karte({ spalte: "erledigt", verlauf: [{ zeitpunkt: "2026-11-12T09:00:00Z", text: "x" }] }),
      ),
    ).toBe("2026-11-12T09:00:00Z");
  });

  test("Summe je Kategorie diese Woche, Hochrechnung aus dem Wochenschnitt", () => {
    const posten = zeitposten(
      [
        { punktId: "a", datum: "2026-11-10", minuten: 60, kategorie: "Belege & Qonto" },
        { punktId: "b", datum: "2026-11-12", minuten: 30, kategorie: "Ablage & Drive" },
        // Vorwoche
        { punktId: "a", datum: "2026-11-03", minuten: 150, kategorie: "Belege & Qonto" },
      ],
      [karte({ archiviertAm: new Date(2026, 10, 11, 9).toISOString() })],
      [new Date(2026, 10, 12, 9).toISOString()],
    );
    const w = wochenzeit(posten, heute);
    expect(w.summe).toBe(60 + 30 + 5 + 3);
    expect(w.jeKategorie[0]).toEqual({ kategorie: "Belege & Qonto", minuten: 65 });
    expect(w.wochen).toBe(2);
    // Ø (98 + 150) / 2 = 124 min = 2,0667 Std. je Woche → × 52/12
    expect(w.monatStunden).toBeCloseTo((124 / 60) * (52 / 12));
    expect(stundenText(90)).toBe("1,5 Std.");
    expect(wochenzeit([], heute).monatStunden).toBe(0);
  });
});

describe("Posteingang", () => {
  test("Vorschlag aus dem Postfach", () => {
    expect(vorschlagFuer("ankauf@").aktion).toBe("eingang");
    expect(vorschlagFuer("info@").zustaendig).toBe("backoffice");
    expect(vorschlagFuer("timo.birk@", "o1")).toMatchObject({ zustaendig: "gf", objektId: "o1" });
  });

  test("Absender lesen und Antwort-Entwurf", () => {
    expect(absenderLesen('"Notariat Muster" <info@notar.de>')).toEqual({
      name: "Notariat Muster",
      email: "info@notar.de",
    });
    expect(absenderLesen("info@notar.de").email).toBe("info@notar.de");
    expect(absenderLesen("Stadtwerke").email).toBeNull();
    const m = { betreff: "KV-Entwurf", absenderEmail: "a@b.de" } as Posteingangsmail;
    expect(antwortAdresse(m)).toContain("su=Re%3A+KV-Entwurf");
    expect(antwortAdresse(m)).toContain("to=a%40b.de");
  });
});
