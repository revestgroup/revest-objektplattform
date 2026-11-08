import { describe, expect, test } from "bun:test";

import {
  STANDARD_SUCHPROFIL,
  adresseNormalisieren,
  profilAbweichungen,
  sortiereEingang,
  textAuslesen,
  wiedererkennen,
  type Angebotseingang,
} from "./eingang";
import { MOCK_OBJEKTE } from "./mockDaten";

const MAKLER = `Von: Brandt & Partner <ostermann@beispiel.de>
Betreff: Neues Angebot Eselsberg

Sehr geehrter Herr Birk,

anbei das Exposé zur Eigentumswohnung in der Rebhangweg 9, 89075 Ulm.
3-Zimmer, Wohnfläche ca. 78,5 m², 2. OG, vermietet.
Kaufpreis: 289.000 € zzgl. 3,57 % Käuferprovision.`;

const IMMOMETRICA = `ImmoMetrica Suchauftrag „Ulm ETW“ – 1 neuer Treffer
Mehrfamilienhaus · Söflinger Str. 112 · 89077 Ulm
Preis: 1,25 Mio € · 412 m² · 8 Einheiten`;

const eingang = (teil: Partial<Angebotseingang>): Angebotseingang => ({
  id: "e1",
  strasse: "",
  plz: "",
  stadt: "Ulm",
  stadtteil: null,
  preis: null,
  flaeche: null,
  zimmer: null,
  objektart: "etw",
  absender: null,
  absenderEmail: null,
  kontaktId: null,
  eingangAm: "2026-11-08T08:00:00Z",
  quelle: "makler",
  expose: null,
  mailtext: null,
  status: "offen",
  grund: null,
  objektId: null,
  gesichtetAm: null,
  ...teil,
});

describe("Ankauf-Eingang: Texterkennung", () => {
  test("Makler-Mail", () => {
    const e = textAuslesen(MAKLER);
    expect(e.strasse).toBe("Rebhangweg 9");
    expect(e.plz).toBe("89075");
    expect(e.stadt).toBe("Ulm");
    expect(e.preis).toBe(289_000);
    expect(e.flaeche).toBe(78.5);
    expect(e.zimmer).toBe(3);
    expect(e.objektart).toBe("etw");
    expect(e.absender).toBe("Brandt & Partner");
    expect(e.absenderEmail).toBe("ostermann@beispiel.de");
    expect(e.quelle).toBe("makler");
  });

  test("ImmoMetrica mit Mio-Preis und Str.-Abkürzung", () => {
    const e = textAuslesen(IMMOMETRICA);
    expect(e.strasse).toBe("Söflinger Str. 112");
    expect(e.preis).toBe(1_250_000);
    expect(e.flaeche).toBe(412);
    expect(e.objektart).toBe("mfh");
    expect(e.quelle).toBe("immometrica");
  });

  test("lieber leer als falsch", () => {
    const e = textAuslesen("Hallo, haben Sie Interesse an einer Immobilie?");
    expect(e.strasse).toBeNull();
    expect(e.preis).toBeNull();
    expect(e.flaeche).toBeNull();
  });
});

describe("Ankauf-Eingang: Wiedererkennung und Profil", () => {
  test("Adressen werden vereinheitlicht", () => {
    expect(adresseNormalisieren("Söflinger Str. 112")).toBe(
      adresseNormalisieren("söflinger straße 112"),
    );
  });

  test("bekanntes Objekt wird erkannt, mit Datum und damaligem Preis", () => {
    const b = wiedererkennen(eingang({ strasse: "Rebhangweg 9" }), MOCK_OBJEKTE, []);
    expect(b?.objekt?.id).toBe("obj-011");
    expect(b?.damals).toBe(445_000);
  });

  test("früheres Angebot zählt auch ohne Objekt", () => {
    const alt = eingang({
      id: "e0",
      strasse: "Neue Gasse 4",
      eingangAm: "2025-03-01T00:00:00Z",
      preis: 199_000,
    });
    const b = wiedererkennen(eingang({ strasse: "Neue Gasse 4" }), MOCK_OBJEKTE, [alt]);
    expect(b?.objekt).toBeNull();
    expect(b?.seit).toBe("2025-03-01T00:00:00Z");
    expect(b?.damals).toBe(199_000);
  });

  test("außerhalb des Profils: markiert und unten einsortiert", () => {
    const teuer = eingang({
      id: "a",
      preis: 500_000,
      flaeche: 80,
      eingangAm: "2026-11-08T10:00:00Z",
    });
    const gut = eingang({
      id: "b",
      preis: 240_000,
      flaeche: 80,
      eingangAm: "2026-11-07T10:00:00Z",
    });
    expect(profilAbweichungen(teuer, STANDARD_SUCHPROFIL)[0]).toContain("€/m² über Profil");
    expect(profilAbweichungen(gut, STANDARD_SUCHPROFIL)).toEqual([]);
    expect(sortiereEingang([teuer, gut], STANDARD_SUCHPROFIL).map((e) => e.id)).toEqual(["b", "a"]);
  });
});
