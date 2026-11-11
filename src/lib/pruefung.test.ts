import { describe, expect, test } from "bun:test";

import { MOCK_OBJEKTE } from "./mockDaten";
import type { Objekt } from "./objekte";
import {
  UNTERLAGEN,
  anforderungsMail,
  datumAusName,
  gmailEntwurfLink,
  grundbuchstand,
  pruefpunkteFuer,
  pruefstand,
  unterlagenFuer,
  unterlagenstatus,
  warnungFuer,
  zugeordneteDatei,
} from "./pruefung";

const etw = (teil: Partial<Objekt> = {}): Objekt => ({
  ...MOCK_OBJEKTE.find((o) => o.objektart === "etw")!,
  stufe: "qualifiziert",
  zustand: "leerstand",
  denkmalschutz: false,
  erbbaurecht: false,
  pruefung: null,
  dokumente: [],
  kuerzel: "REB9",
  ...teil,
});

const dok = (id: string, name: string) => ({
  id,
  name,
  ordner: "",
  groesseKb: 1,
  hochgeladenAm: "2026-11-01",
});

const ids = (o: Objekt) => unterlagenFuer(o).map((u) => u.id);

describe("Checkliste Ankauf: Zusammenstellung", () => {
  test("24 Punkte, drei Gruppen", () => {
    expect(UNTERLAGEN).toHaveLength(24);
    expect(UNTERLAGEN.filter((u) => u.gruppe === "basis")).toHaveLength(12);
    expect(UNTERLAGEN.filter((u) => u.gruppe === "objektart")).toHaveLength(6);
    expect(UNTERLAGEN.filter((u) => u.gruppe === "intern")).toHaveLength(6);
  });

  test("ETW: WEG-Unterlagen, keine Haus-Unterlagen; leer stehend ohne Mietverträge", () => {
    const o = etw();
    expect(ids(o)).toContain("teilungserklaerung");
    expect(ids(o)).toContain("eigentuemerliste");
    expect(ids(o)).not.toContain("lageplan");
    expect(ids(o)).not.toContain("mietvertrag");
    expect(ids(o)).not.toContain("erbbaurechtsvertrag");
    // 24 − 4 Haus-Punkte − Mietverträge − Erbbaurecht
    expect(ids(o)).toHaveLength(18);
  });

  test("MFH vermietet mit Erbbaurecht: Haus-Unterlagen, Mietverträge, Erbbaurechtsvertrag", () => {
    const o = etw({ objektart: "mfh", zustand: "vermietet", erbbaurecht: true });
    expect(ids(o)).toEqual(
      expect.arrayContaining(["lageplan", "umbauter_raum", "mietvertrag", "erbbaurechtsvertrag"]),
    );
    expect(ids(o)).not.toContain("teilungserklaerung");
    expect(pruefpunkteFuer(o).map((p) => p.id)).not.toContain("hausgeld");
  });

  test("EFH zählt als Haus", () => {
    expect(ids(etw({ objektart: "efh" }))).toContain("gebaeudeversicherung");
  });

  test("alte Einträge (Aufteilungsplan) gelten für die Teilungspläne", () => {
    const o = etw({ pruefung: { unterlagen: { aufteilungsplan: { status: "liegt_vor" } } } });
    expect(unterlagenstatus(o, "teilungsplaene")).toBe("liegt_vor");
  });

  test("„entfällt“ zählt nicht mit", () => {
    const o = etw({ pruefung: { unterlagen: { baugenehmigung: { status: "entfaellt" } } } });
    expect(pruefstand(o).gesamt).toBe(pruefstand(etw()).gesamt - 1);
  });
});

describe("Checkliste Ankauf: Warnung", () => {
  test("nur bei fehlenden Basis-Unterlagen oder Kritischem", () => {
    const o = etw();
    expect(warnungFuer(o, "besichtigt")).toBeNull();
    expect(warnungFuer(o, "angebot")?.offenePflicht).toContain("Exposé");

    const alleBasis = {
      unterlagen: Object.fromEntries(
        unterlagenFuer(o)
          .filter((u) => u.gruppe === "basis")
          .map((u) => [u.id, { status: "liegt_vor" as const }]),
      ),
    };
    // Offene Prüfpunkte und fehlende Intern-Unterlagen warnen nicht mehr.
    expect(warnungFuer(etw({ pruefung: alleBasis }), "angebot")).toBeNull();
    expect(
      warnungFuer(
        etw({ pruefung: { ...alleBasis, punkte: { stellplatz: { status: "kritisch" } } } }),
        "angekauft",
      )?.kritisch,
    ).toEqual(["Stellplatz/TG mit eigenem Grundbuch"]);
  });
});

describe("Checkliste Ankauf: Dateien und Grundbuch", () => {
  test("Zuordnung über den Dateinamen, von Hand gesetzt gewinnt", () => {
    const o = etw({
      dokumente: [dok("d1", "Grundbuchauszug_Eselsberg.pdf"), dok("d2", "WEG_Protokoll_2025.pdf")],
    });
    expect(zugeordneteDatei(o, "weg_protokolle")?.id).toBe("d2");
    const vonHand = etw({
      ...o,
      pruefung: { unterlagen: { grundbuch: { status: "fehlt", dokumentId: null } } },
    });
    expect(zugeordneteDatei(vonHand, "grundbuch")).toBeNull();
  });

  test("Datum aus dem Dateinamen", () => {
    expect(datumAusName("Grundbuch_2026-07-01.pdf")).toBe("2026-07-01");
    expect(datumAusName("Grundbuch 14.9.2026.pdf")).toBe("2026-09-14");
    expect(datumAusName("Grundbuch.pdf")).toBeNull();
  });

  test("älter als 3 Monate → neu anfordern", () => {
    const heute = new Date("2026-11-11");
    const alt = etw({ dokumente: [dok("d1", "Grundbuchauszug_2026-07-01.pdf")] });
    expect(grundbuchstand(alt, heute)).toEqual({ datum: "2026-07-01", ausName: true, alt: true });
    const eingegeben = etw({
      pruefung: { unterlagen: { grundbuch: { status: "liegt_vor", datum: "2026-10-01" } } },
    });
    expect(grundbuchstand(eingegeben, heute).alt).toBe(false);
  });
});

describe("Checkliste Ankauf: Unterlagen anfordern", () => {
  test("Betreff mit Kürzel, nur Basis und Objektart, Anrede aus dem Namen", () => {
    const o = etw({
      pruefung: { unterlagen: { expose: { status: "liegt_vor" } } },
    });
    const m = anforderungsMail(o, {
      name: "Brandt & Partner, Herr Ostermann",
      email: "o@beispiel.de",
    });
    expect(m.an).toBe("o@beispiel.de");
    expect(m.betreff.startsWith("[REB9] Unterlagen")).toBe(true);
    expect(m.text.startsWith("Guten Tag Herr Ostermann,")).toBe(true);
    expect(m.text).toContain("- Teilungserklärung");
    expect(m.text).not.toContain("- Exposé\n");
    expect(m.text).not.toContain("Bodenrichtwert");
    expect(m.ids).toContain("ruecklagennachweis");
    expect(gmailEntwurfLink(m)).toContain("su=%5BREB9%5D");
  });
});
