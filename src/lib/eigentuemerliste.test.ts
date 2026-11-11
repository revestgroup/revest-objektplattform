import { describe, expect, test } from "bun:test";

import { eigentuemerAuslesen } from "./eigentuemerliste";

describe("Eigentümerliste WEG", () => {
  test("Tabellen-Text mit Kopf, WE-Nummer und Sperrvermerk", () => {
    const e = eigentuemerAuslesen(
      [
        "Name\tAnschrift\tWE",
        "Erika Muster\tLindenweg 3, 89075 Ulm\tWE 2",
        "Hans Beispiel; Hauptstraße 1, 89231 Neu-Ulm; 5; kein Kontakt",
        "",
      ].join("\n"),
      { quelle: "Eigentümerliste WEG", angabeAm: "2026-11-11" },
    );
    expect(e).toHaveLength(2);
    expect(e[0]).toMatchObject({
      name: "Erika Muster",
      anschrift: "Lindenweg 3, 89075 Ulm",
      weNr: "2",
    });
    expect(e[1]).toMatchObject({ name: "Hans Beispiel", weNr: "5", kontaktNichtGewuenscht: true });
    expect(e[1].anschrift).toBe("Hauptstraße 1, 89231 Neu-Ulm");
    expect(e[0].quelle).toBe("Eigentümerliste WEG");
  });
});
