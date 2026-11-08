import { describe, expect, test } from "bun:test";

import { MOCK_OBJEKTE } from "./mockDaten";
import type { Objekt } from "./objekte";
import {
  istUeberfaellig,
  mitAbmeldungen,
  mitUmmeldungen,
  ohneOffeneAbmeldungen,
} from "./ummeldungen";

const projekt = (teil: Partial<Objekt> = {}): Objekt => ({
  ...MOCK_OBJEKTE.find((o) => o.stufe === "angekauft")!,
  besitzuebergangAm: null,
  ummeldungen: null,
  ...teil,
});

const JETZT = new Date("2026-11-08T12:00:00Z");

describe("Ummeldungen", () => {
  test("ohne Besitzübergang nichts, mit genau sieben — und nur einmal", () => {
    expect(mitUmmeldungen(projekt()).ummeldungen).toBeNull();
    const a = mitUmmeldungen(projekt({ besitzuebergangAm: "2026-10-01" }));
    expect(a.ummeldungen).toHaveLength(7);
    expect(mitUmmeldungen(a).ummeldungen).toHaveLength(7);
  });

  test("Abmeldungen je Einheit, Rücknahme räumt nur unberührte weg", () => {
    const o = projekt();
    const e = o.einheiten[0].id;
    const mit = mitAbmeldungen(o, e);
    expect(mit.ummeldungen?.filter((u) => u.richtung === "ab")).toHaveLength(7);
    expect(mitAbmeldungen(mit, e).ummeldungen).toHaveLength(7);
    expect(ohneOffeneAbmeldungen(mit, e).ummeldungen).toHaveLength(0);

    const angefasst = {
      ...mit,
      ummeldungen: mit.ummeldungen!.map((u, i) =>
        i === 0 ? { ...u, status: "gemeldet" as const } : u,
      ),
    };
    expect(ohneOffeneAbmeldungen(angefasst, e).ummeldungen).toHaveLength(7);
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
