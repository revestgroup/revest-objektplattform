import { describe, expect, test } from "bun:test";

import { STANDARD_ZIELE, trichter, zeitraumFuer } from "./auswertung";
import { STANDARD_VORGABEN } from "./kalkulationEtw";
import { MOCK_EINGANG } from "./mockEingang";
import { MOCK_OBJEKTE } from "./mockDaten";
import {
  googleTerminAdresse,
  jetztLage,
  kalenderwoche,
  kennzahlen,
  sichtbareGedanken,
  sprintEintraege,
  sprintfenster,
  sprintZeilen,
  tagIso,
  vermerkGilt,
  zeileSichtbar,
  type Gedanke,
  gruss,
  reiterFuer,
  reiterWaehlen,
  rolleLesen,
  zustaendigAufgabe,
  zustaendigKarte,
} from "./cockpit";

describe("Cockpit: Rollen", () => {
  test("Rolle aus dem Speicher, Unbekanntes wird Geschäftsführung", () => {
    expect(rolleLesen("backoffice")).toBe("backoffice");
    expect(rolleLesen("gf")).toBe("gf");
    expect(rolleLesen(null)).toBe("gf");
    expect(rolleLesen("chef")).toBe("gf");
  });

  test("Backoffice sieht nie den persönlichen Reiter", () => {
    expect(reiterFuer("gf")).toEqual(["alltag", "persoenlich"]);
    expect(reiterFuer("backoffice")).toEqual(["backoffice"]);
    expect(reiterWaehlen("backoffice", "persoenlich")).toBe("backoffice");
    expect(reiterWaehlen("gf", "persoenlich")).toBe("persoenlich");
    expect(reiterWaehlen("gf", "backoffice")).toBe("alltag");
    expect(reiterWaehlen("gf", undefined)).toBe("alltag");
  });

  test("Zuständig: Standard je Art", () => {
    expect(zustaendigAufgabe({})).toBe("gf");
    expect(zustaendigAufgabe({ zustaendig: "backoffice" })).toBe("backoffice");
    expect(zustaendigKarte({})).toBe("backoffice");
    expect(zustaendigKarte({ zustaendig: null })).toBe("backoffice");
    expect(zustaendigKarte({ zustaendig: "gf" })).toBe("gf");
  });

  test("Gruß nach Tageszeit", () => {
    expect(gruss(new Date(2026, 10, 12, 8))).toBe("Guten Morgen");
    expect(gruss(new Date(2026, 10, 12, 14))).toBe("Hallo");
    expect(gruss(new Date(2026, 10, 12, 20))).toBe("Guten Abend");
  });
});

describe("Cockpit: Sprint", () => {
  const tag = new Date(2026, 10, 12, 15, 30); // Do 12.11.2026
  const stufe = (id: string) => (id === "p" ? "angekauft" : id === "a" ? "besichtigt" : null);

  test("Fenster je Ansicht", () => {
    const t = sprintfenster("tag", tag);
    expect(new Date(t.von).getHours()).toBe(7);
    expect(new Date(t.bis).getHours()).toBe(20);
    expect(t.achse[0]).toEqual({ text: "07", lage: 0 });
    const w = sprintfenster("woche", tag);
    expect(tagIso(new Date(w.von))).toBe("2026-11-09");
    expect(w.titel).toBe("KW 46");
    expect(w.achse).toHaveLength(7);
    const m = sprintfenster("monat", tag);
    expect(tagIso(new Date(m.von))).toBe("2026-11-01");
    expect(tagIso(new Date(m.bis))).toBe("2026-12-01");
    // 1.11.2026 ist ein Sonntag: erste Marke ist der Montag danach.
    expect(m.achse[0].text).toBe("KW 45");
    expect(sprintfenster("monat", new Date(2026, 8, 10)).achse[0].text).toBe("KW 36");
    expect(kalenderwoche(new Date(2026, 0, 1))).toBe(1);
    expect(kalenderwoche(new Date(2027, 0, 1))).toBe(53);
  });

  test("Termin mit Zeitblock wird ein Balken in der Tagesansicht", () => {
    const e = sprintEintraege(
      [
        {
          id: "t1",
          titel: "Besichtigung",
          art: "besichtigung",
          objektId: "a",
          faelligAm: new Date(2026, 10, 12).toISOString(),
          erledigtAm: null,
          zeitblock: { von: "08:30", bis: "09:30" },
        },
        // Termin ohne Uhrzeit: nur in Woche/Monat.
        {
          id: "t2",
          titel: "Baustelle",
          art: "termin",
          objektId: "p",
          faelligAm: new Date(2026, 10, 12).toISOString(),
          erledigtAm: null,
        },
        // Aufgabe ohne Zeitblock und ohne Terminart: kein Balken.
        {
          id: "x",
          titel: "Anruf",
          art: "anruf",
          objektId: null,
          faelligAm: new Date(2026, 10, 12).toISOString(),
          erledigtAm: null,
        },
      ],
      [
        {
          id: "s1",
          bereich: "Plattform",
          titel: "Feinschliff",
          von: "2026-11-12T19:00",
          bis: "2026-11-12T22:00",
        },
      ],
      stufe,
    );
    expect(e).toHaveLength(3);
    const tagZ = sprintZeilen(e, sprintfenster("tag", tag), "tag", ["Ankauf", "Projekte"]);
    const ankauf = tagZ.find((z) => z.bereich === "Ankauf")!;
    expect(ankauf.balken).toHaveLength(1);
    expect(ankauf.balken[0].links).toBeCloseTo(1.5 / 13);
    expect(ankauf.balken[0].breite).toBeCloseTo(1 / 13);
    expect(ankauf.balken[0].unter).toBe("08:30 – 09:30");
    expect(tagZ.find((z) => z.bereich === "Projekte")!.balken).toHaveLength(0);
    // Sprint-Punkt über 20 Uhr hinaus wird abgeschnitten, Bereich kommt dazu.
    const pl = tagZ.find((z) => z.bereich === "Plattform")!;
    expect(pl.balken[0].links + pl.balken[0].breite).toBeCloseTo(1);
    const woZ = sprintZeilen(e, sprintfenster("woche", tag), "woche", ["Ankauf", "Projekte"]);
    const pr = woZ.find((z) => z.bereich === "Projekte")!.balken[0];
    expect(pr.links).toBeCloseTo(3 / 7);
    expect(pr.spur).toBe(0);
    expect(pr.breite).toBeCloseTo(1 / 7);
    expect(pr.unter).toBe("12.11.");
  });

  test("Woche: Termine belegen ganze Tage, Überschneidungen bekommen eigene Spuren", () => {
    const e = sprintEintraege(
      [],
      [
        {
          id: "a",
          bereich: "Ankauf",
          titel: "A",
          von: "2026-11-12T09:00",
          bis: "2026-11-12T10:00",
        },
        {
          id: "b",
          bereich: "Ankauf",
          titel: "B",
          von: "2026-11-12T15:00",
          bis: "2026-11-12T16:00",
        },
        {
          id: "c",
          bereich: "Ankauf",
          titel: "C",
          von: "2026-11-13T09:00",
          bis: "2026-11-13T10:00",
        },
      ],
      () => null,
    );
    const w = sprintZeilen(e, sprintfenster("woche", tag), "woche", ["Ankauf"])[0];
    expect(w.balken.map((b) => b.spur)).toEqual([0, 1, 0]);
    expect(w.spuren).toBe(2);
    expect(w.balken[0].breite).toBeCloseTo(1 / 7);
    expect(w.balken[0].unter).toBe("12.11. 09:00");
    // In der Tagesansicht überschneiden sich A und B nicht.
    const t = sprintZeilen(e, sprintfenster("tag", tag), "tag", ["Ankauf"])[0];
    expect(t.spuren).toBe(1);
  });

  test("Jetzt-Linie nur im Fenster", () => {
    const f = sprintfenster("tag", tag);
    expect(jetztLage(f, tag)).toBeCloseTo(8.5 / 13);
    expect(jetztLage(f, new Date(2026, 10, 13, 9))).toBeNull();
  });
});

describe("Cockpit: Gedanken und Tisch", () => {
  const heute = new Date(2026, 10, 12, 10);
  const g = (id: string, ziel: Gedanke["ziel"], sortiertAm: string | null): Gedanke => ({
    id,
    text: id,
    angelegtAm: "2026-11-01T08:00:00Z",
    ziel,
    sortiertAm,
    verweisId: null,
    zustaendig: "gf",
    quelle: "hand",
    externeId: null,
    kiVorschlag: null,
  });

  test("Eingang zeigt Unsortiertes und heute Sortiertes", () => {
    const l = sichtbareGedanken(
      [
        g("offen", null, null),
        g("heute", "idee", new Date(2026, 10, 12, 9).toISOString()),
        g("gestern", "aufgabe", new Date(2026, 10, 11, 9).toISOString()),
      ],
      heute,
    );
    expect(l.map((x) => x.id)).toEqual(["offen", "heute"]);
  });

  test("„später“ gilt nur heute, abgegebene Zeilen verschwinden ab morgen", () => {
    expect(vermerkGilt({ wahl: "spaeter", am: "2026-11-12" }, heute)).toBe("spaeter");
    expect(vermerkGilt({ wahl: "spaeter", am: "2026-11-11" }, heute)).toBeNull();
    expect(zeileSichtbar({ wahl: "spaeter", am: "2026-11-11" }, heute)).toBe(true);
    expect(zeileSichtbar({ wahl: "backoffice", am: "2026-11-12" }, heute)).toBe(true);
    expect(zeileSichtbar({ wahl: "backoffice", am: "2026-11-11" }, heute)).toBe(false);
    expect(zeileSichtbar({ wahl: "ich", am: "2026-11-01" }, heute)).toBe(true);
    expect(zeileSichtbar(undefined, heute)).toBe(true);
  });
});

describe("Cockpit: Kalender und Kennzahlen", () => {
  test("Google-Link mit Zeitraum, Titel und Ort", () => {
    const a = googleTerminAdresse({
      titel: "[KAS8] Besichtigung",
      start: new Date(2026, 10, 12, 15, 0),
      ende: new Date(2026, 10, 12, 16, 0),
      ort: "Ulm",
    });
    expect(a.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE")).toBe(true);
    expect(a).toContain("dates=20261112T150000%2F20261112T160000");
    expect(a).toContain("text=%5BKAS8%5D+Besichtigung");
    expect(a).toContain("location=Ulm");
  });

  test("Kennzahlen entsprechen der Auswertung", () => {
    const heute = new Date("2026-10-20T10:00:00Z");
    const k = kennzahlen(MOCK_OBJEKTE, MOCK_EINGANG, STANDARD_VORGABEN, STANDARD_ZIELE, heute);
    expect(k).toHaveLength(5);
    const monat = trichter(MOCK_OBJEKTE, MOCK_EINGANG, zeitraumFuer("monat", heute));
    expect(k[1].ist).toBe(monat.find((t) => t.id === "besichtigt")!.anzahl);
    expect(k[0].ziel).toBeNull();
    expect(k[4].geld).toBe(true);
    expect(k[4].ziel).toBe(STANDARD_ZIELE.jahresgewinn);
  });
});
