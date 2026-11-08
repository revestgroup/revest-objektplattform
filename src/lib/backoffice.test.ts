import { describe, expect, test } from "bun:test";

import {
  ablageOrdnerVorschlag,
  artAusName,
  istUeberfaellig,
  titelAusName,
  weiterleiten,
} from "./backoffice";
import { MOCK_BACKOFFICE } from "./mockBackoffice";

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

  test("Weiterleiten: nach Erledigt, Übergabe wartet, im Verlauf vermerkt", () => {
    const k = weiterleiten(
      MOCK_BACKOFFICE[0],
      "qonto",
      "Label FAH6",
      new Date("2026-11-08T10:00:00Z"),
    );
    expect(k.spalte).toBe("erledigt");
    expect(k.uebergabe).toEqual({
      ziel: "qonto",
      status: "wartet",
      am: "2026-11-08T10:00:00.000Z",
      details: "Label FAH6",
    });
    expect(k.verlauf.at(-1)?.text).toContain("An Qonto übergeben");
  });

  test("überfällig nur, solange nicht erledigt", () => {
    const k = { ...MOCK_BACKOFFICE[1], faelligAm: "2026-11-01" };
    expect(istUeberfaellig(k, new Date("2026-11-08"))).toBe(true);
    expect(istUeberfaellig({ ...k, spalte: "erledigt" }, new Date("2026-11-08"))).toBe(false);
  });
});
