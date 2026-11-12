import { describe, expect, test } from "bun:test";

import { STANDARD_VORGABEN } from "./kalkulationEtw";
import { MOCK_OBJEKTE } from "./mockDaten";
import type { Objekt } from "./objekte";
import {
  ABSCHLUSSPUNKTE,
  abschlussstand,
  datenraumDatei,
  datenraumVollstaendig,
  nachkalkulation,
} from "./projektabschluss";

const dok = (id: string, name: string, ordner: string) => ({
  id,
  name,
  ordner,
  groesseKb: 1,
  hochgeladenAm: "2026-11-01",
});

const projekt = (teil: Partial<Objekt> = {}): Objekt => ({
  ...MOCK_OBJEKTE.find((o) => o.stufe === "angekauft")!,
  dokumente: [],
  datenraum: undefined,
  nachkalkulation: undefined,
  abschluss: undefined,
  ...teil,
});

describe("Projektabschluss: Datenraum", () => {
  test("Zuordnung über den Namen, Vertriebsordner zuerst; entfällt zählt nicht", () => {
    const o = projekt({
      dokumente: [
        dok("a", "Energieausweis_2019.pdf", "01_Unterlagen/01_Unterlagen zum Objekt"),
        dok("b", "Energieausweis_neu.pdf", "05_Verkauf/00_Vertrieb"),
      ],
    });
    expect(datenraumDatei(o, "energieausweis")?.id).toBe("b");
    expect(datenraumVollstaendig(o)).toEqual({ da: 1, gesamt: 13, vollstaendig: false });
    const fast = projekt({
      ...o,
      datenraum: Object.fromEntries(
        [
          "lageplan",
          "plaene_alt",
          "grundrisse_neu",
          "wohnflaeche_neu",
          "versicherung",
          "grundbuch",
          "umbauter_raum",
          "baubeschreibung",
          "fotos",
          "wirtschaftsplan",
          "mietvertrag",
          "protokolle",
        ].map((id) => [id, { entfaellt: true }]),
      ),
    });
    expect(datenraumVollstaendig(fast)).toEqual({ da: 1, gesamt: 1, vollstaendig: true });
  });
});

describe("Projektabschluss: Nachkalkulation", () => {
  test("Abweichung je Position und Gewinn Soll/Ist", () => {
    const o = projekt({
      nachkalkulation: {
        ist: {
          kaufpreis: 1_500_000,
          nebenkosten: 100_000,
          aufwertung: 300_000,
          bewirtschaftung: 5_000,
          finanzierung: 40_000,
          vermarktung: 20_000,
        },
        verkaufspreis: 2_400_000,
      },
    });
    const n = nachkalkulation(o, STANDARD_VORGABEN);
    const kp = n.zeilen.find((z) => z.id === "kaufpreis")!;
    expect(kp.ist).toBe(1_500_000);
    expect(kp.abweichung).toBe(1_500_000 - (o.kaufpreis ?? 0));
    const gewinn = n.zeilen.find((z) => z.id === "gewinn")!;
    expect(gewinn.ist).toBe(2_400_000 - 1_965_000);
    expect(n.vollstaendig).toBe(true);
  });

  test("ohne alle Ist-Werte nicht vollständig", () => {
    expect(
      nachkalkulation(
        projekt({ nachkalkulation: { ist: { finanzierung: null } } }),
        STANDARD_VORGABEN,
      ).vollstaendig,
    ).toBe(false);
  });
});

describe("Projektabschluss: Checkliste", () => {
  test("automatische Haken: KV im Notarordner, Übergabeprotokoll", () => {
    const o = projekt({
      dokumente: [
        dok("k", "Kaufvertrag_WE1.pdf", "05_Verkauf/01_Notar"),
        dok("p", "Uebergabeprotokoll_WE1.pdf", "05_Verkauf"),
      ],
    });
    const s = abschlussstand(o, STANDARD_VORGABEN);
    expect(s.punkte.find((p) => p.punkt.id === "kv")?.automatisch).toBe(true);
    expect(s.punkte.find((p) => p.punkt.id === "protokoll")?.erledigt).toBe(true);
    expect(s.abgeschlossen).toBe(false);
  });

  test("abgeschlossen erst, wenn alle Punkte erledigt sind", () => {
    const alle = Object.fromEntries(
      ABSCHLUSSPUNKTE.map((p, i) => [p.id, { erledigtAm: `2026-11-0${i + 1}` }]),
    );
    const s = abschlussstand(projekt({ abschluss: alle }), STANDARD_VORGABEN);
    expect(s.abgeschlossen).toBe(true);
    expect(s.abgeschlossenAm).toBe("2026-11-07");
    const fast = { ...alle, notar: { erledigtAm: null } };
    expect(abschlussstand(projekt({ abschluss: fast }), STANDARD_VORGABEN).abgeschlossen).toBe(
      false,
    );
  });
});
