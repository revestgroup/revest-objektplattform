import { describe, expect, test } from "bun:test";

import {
  ablageOrdnerVorschlag,
  archivFiltern,
  archivieren,
  artAusName,
  haengtFest,
  istUeberfaellig,
  ortVon,
  titelAusName,
  uebergabeSetzen,
  weiterleiten,
  zurueckholen,
} from "./backoffice";
import { MOCK_BACKOFFICE } from "./mockBackoffice";

const T0 = new Date("2026-11-08T10:00:00Z");
const tag = (n: number) => new Date(T0.getTime() + n * 86_400_000);

describe("Backoffice", () => {
  test("aus dem Dateinamen: Titel und Art", () => {
    expect(titelAusName("2026-11-05_Rechnung_Kessler_Abschlag2.pdf")).toBe(
      "Rechnung Kessler Abschlag2",
    );
    expect(artAusName("2026-11-05_Rechnung_Kessler.pdf")).toBe("rechnung");
    expect(artAusName("Finanzamt_Bescheid.pdf")).toBe("behoerde");
    expect(artAusName("Mietvertrag_WE3.pdf")).toBe("vertrag");
    expect(artAusName("IMG_2041.jpg")).toBe("sonstiges");
    expect(ablageOrdnerVorschlag("rechnung")).toBe("01_Eingangsrechnungen");
  });

  test("überfällig nur, solange nicht erledigt", () => {
    const k = { ...MOCK_BACKOFFICE[1], faelligAm: "2026-11-01" };
    expect(istUeberfaellig(k, new Date("2026-11-08"))).toBe(true);
    expect(istUeberfaellig({ ...k, spalte: "erledigt" }, new Date("2026-11-08"))).toBe(false);
  });
});

describe("Backoffice: Übergabe und Archiv", () => {
  const start = { ...MOCK_BACKOFFICE[0], spalte: "in_arbeit" as const };

  test("Weiterleiten: Karte bleibt sichtbar, Status „wartet“", () => {
    const k = weiterleiten(start, "qonto", "Label FAH6", T0);
    expect(k.spalte).toBe("in_arbeit");
    expect(k.uebergabe?.status).toBe("wartet");
    expect(ortVon(k)).toBe("qonto");
    expect(k.verlauf.at(-1)?.text).toContain("An Qonto weitergeleitet");
  });

  test("bestätigt nur mit Nachweis, dann ins Archiv; fehlgeschlagen nur mit Grund", () => {
    const k = weiterleiten(start, "qonto", "", T0);
    expect(() => uebergabeSetzen(k, "bestaetigt", {}, tag(1))).toThrow();
    expect(() => uebergabeSetzen(k, "fehlgeschlagen", {}, tag(1))).toThrow();
    const ue = uebergabeSetzen(k, "uebertragen", {}, tag(1));
    expect(ortVon(ue)).toBe("qonto");
    const ok = uebergabeSetzen(ue, "bestaetigt", { link: "https://app.qonto.com/tx/1" }, tag(2));
    expect(ok.archiviertAm).toBe(tag(2).toISOString());
    expect(ortVon(ok)).toBe("archiv");
  });

  test("Zurückholen: Posteingang, Übergabe beendet, Verlauf bleibt", () => {
    const ok = uebergabeSetzen(
      weiterleiten(start, "ablage", "", T0),
      "bestaetigt",
      { link: "drive" },
      tag(1),
    );
    const z = zurueckholen(ok, tag(3));
    expect(ortVon(z)).toBe("posteingang");
    expect(z.uebergabe).toBeNull();
    expect(z.verlauf.length).toBe(ok.verlauf.length + 1);
  });

  test("Erledigt ohne Weiterleitung kommt erst mit Bestätigung ins Archiv", () => {
    const e = { ...start, spalte: "erledigt" as const };
    expect(ortVon(e)).toBe("erledigt");
    expect(ortVon(archivieren(e, T0))).toBe("archiv");
  });

  test("hängt fest: nach 2 Tagen ohne Bestätigung oder bei Fehler", () => {
    const k = weiterleiten(start, "qonto", "", T0);
    expect(haengtFest(k, tag(1))).toBe(false);
    expect(haengtFest(k, tag(3))).toBe(true);
    expect(
      haengtFest(
        uebergabeSetzen(k, "fehlgeschlagen", { grund: "Beleg abgelehnt" }, tag(1)),
        tag(1),
      ),
    ).toBe(true);
    // Ältere Stände ohne geaendertAm: gemessen ab „am“.
    expect(
      haengtFest({ ...k, uebergabe: { ...k.uebergabe!, geaendertAm: undefined } }, tag(3)),
    ).toBe(true);
  });

  test("Archiv-Filter", () => {
    const a = uebergabeSetzen(
      weiterleiten({ ...start, id: "a", titel: "Rechnung Kessler" }, "qonto", "", T0),
      "bestaetigt",
      { link: "x" },
      tag(1),
    );
    const b = archivieren(
      {
        ...start,
        id: "b",
        titel: "Brief Stadt",
        gesellschaft: "Sanero",
        datei: null,
        notizen: null,
      },
      tag(5),
    );
    const liste = [a, b, start];
    expect(archivFiltern(liste, {}).map((k) => k.id)).toEqual(["b", "a"]);
    expect(archivFiltern(liste, { ziel: "qonto" }).map((k) => k.id)).toEqual(["a"]);
    expect(
      archivFiltern(liste, { ziel: "erledigt", gesellschaft: "Sanero" }).map((k) => k.id),
    ).toEqual(["b"]);
    expect(archivFiltern(liste, { suche: "kessler" }).map((k) => k.id)).toEqual(["a"]);
    expect(archivFiltern(liste, { bis: "2026-11-10" }).map((k) => k.id)).toEqual(["a"]);
  });
});
