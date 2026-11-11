import { describe, expect, test } from "bun:test";

import { MOCK_OBJEKTE } from "./mockDaten";
import type { Objekt } from "./objekte";
import {
  istUeberfaellig,
  mitAbmeldungen,
  mitUmmeldungen,
  artenFuer,
  fehlendeAngaben,
  ohneOffeneAbmeldungen,
  sichtbareUmmeldungen,
  ummeldeTitel,
} from "./ummeldungen";
import { infosText } from "./objekte";

const projekt = (teil: Partial<Objekt> = {}): Objekt => ({
  ...MOCK_OBJEKTE.find((o) => o.stufe === "angekauft")!,
  besitzuebergangAm: null,
  ummeldungen: null,
  ...teil,
});

const JETZT = new Date("2026-11-08T12:00:00Z");

describe("Ummeldungen", () => {
  test("ohne Besitzübergang nichts; MFH bekommt die Haus-Liste — und nur einmal", () => {
    expect(mitUmmeldungen(projekt()).ummeldungen).toBeNull();
    const a = mitUmmeldungen(projekt({ besitzuebergangAm: "2026-10-01" }));
    expect(a.ummeldungen?.map((u) => u.art)).toEqual(artenFuer(a, "an"));
    expect(a.ummeldungen).toHaveLength(8);
    expect(mitUmmeldungen(a)).toBe(a);
  });

  test("Listen je Richtung und Objektart (SAMMLUNG 1)", () => {
    const etw = projekt({ objektart: "etw" });
    expect(artenFuer(etw, "an")).toEqual([
      "grundbesitzabgaben",
      "grundsteuer_anteilig",
      "strom",
      "hausverwaltung",
      "sepa_hausgeld",
    ]);
    expect(artenFuer(etw, "an")).not.toContain("schornsteinfeger");
    const haus = projekt({ objektart: "mfh" });
    expect(artenFuer(haus, "an")).toContain("verwaltungsliste");
    expect(artenFuer(haus, "an")).not.toContain("sepa_hausgeld");
    // Verkauf einer Einheit aus dem MFH: ETW-Liste.
    expect(artenFuer(haus, "ab", "e1")).toEqual([
      "grundbesitzabgaben",
      "grundsteuer_anteilig",
      "strom",
      "hausverwaltung",
    ]);
    expect(artenFuer(haus, "ab")).toContain("grundbuch_versicherung");
    expect(artenFuer(projekt({ objektart: "grundstueck" }), "an")).toEqual([
      "grundbesitzabgaben",
      "grundsteuer_anteilig",
    ]);
    expect(ummeldeTitel("grundsteuer_anteilig", "ab")).toBe(
      "Grundsteuer anteilig mit Käufer abrechnen",
    );
  });

  test("alte Listen (sieben feste Punkte) werden ergänzt, nichts gelöscht; Unberührtes Unpassendes ausgeblendet", () => {
    const alt = [
      "hausverwaltung",
      "gas",
      "strom",
      "wasser",
      "versicherung",
      "schornsteinfeger",
      "grundbesitzabgaben",
    ] as const;
    const o = projekt({
      objektart: "etw",
      besitzuebergangAm: "2026-10-01",
      ummeldungen: alt.map((art) => ({
        id: `x-${art}`,
        art,
        richtung: "an" as const,
        status: art === "gas" ? ("gemeldet" as const) : ("offen" as const),
      })),
    });
    const neu = mitUmmeldungen(o);
    expect(neu.ummeldungen).toHaveLength(9);
    const sichtbar = sichtbareUmmeldungen(neu, "an", null).map((u) => u.art);
    expect(sichtbar).toContain("sepa_hausgeld");
    expect(sichtbar).toContain("gas"); // schon gemeldet → bleibt sichtbar
    expect(sichtbar).not.toContain("schornsteinfeger"); // unberührt, gehört nicht zur ETW
  });

  test("Pflichtangaben der Übergabe, Hausverwaltung nur bei ETW", () => {
    const leer = { datum: null, gesellschaft: null, email: null, hausverwaltung: null };
    expect(fehlendeAngaben(leer, "etw")).toEqual([
      "Übergabedatum",
      "Gesellschaft",
      "E-Mail",
      "Hausverwaltung",
    ]);
    expect(
      fehlendeAngaben(
        { ...leer, datum: "2026-11-01", gesellschaft: "Revest Projekt", email: "a@b.de" },
        "haus",
      ),
    ).toEqual([]);
  });

  test("Schlüsselbox-Code erscheint nie im Text", () => {
    expect(infosText({ wohnungsNr: "3", stellplatzNr: "12", schluesselboxCode: "4711" })).toBe(
      "WE 3 · TG 12",
    );
  });

  test("Abmeldungen je Einheit, Rücknahme räumt nur unberührte weg", () => {
    const o = projekt();
    const e = o.einheiten[0].id;
    const mit = mitAbmeldungen(o, e);
    expect(mit.ummeldungen?.filter((u) => u.richtung === "ab")).toHaveLength(4);
    expect(mitAbmeldungen(mit, e).ummeldungen).toHaveLength(4);
    expect(ohneOffeneAbmeldungen(mit, e).ummeldungen).toHaveLength(0);

    const angefasst = {
      ...mit,
      ummeldungen: mit.ummeldungen!.map((u, i) =>
        i === 0 ? { ...u, status: "gemeldet" as const } : u,
      ),
    };
    expect(ohneOffeneAbmeldungen(angefasst, e).ummeldungen).toHaveLength(4);
  });

  test("überfällig nach 14 Tagen: offen ab Stichtag, gemeldet ab Meldung", () => {
    const o = mitUmmeldungen(projekt({ besitzuebergangAm: "2026-10-20" }));
    const u = o.ummeldungen![0];
    expect(istUeberfaellig(o, u, JETZT)).toBe(true);
    expect(istUeberfaellig({ ...o, besitzuebergangAm: "2026-11-01" }, u, JETZT)).toBe(false);
    expect(istUeberfaellig(o, { ...u, status: "gemeldet", gemeldetAm: "2026-10-30" }, JETZT)).toBe(
      false,
    );
    expect(istUeberfaellig(o, { ...u, status: "gemeldet", gemeldetAm: "2026-10-20" }, JETZT)).toBe(
      true,
    );
    expect(istUeberfaellig(o, { ...u, status: "bestaetigt" }, JETZT)).toBe(false);
  });
});
