import { describe, expect, test } from "bun:test";

import {
  anzeigename,
  kopienAktualisieren,
  nameZerlegen,
  registerAbgleichen,
  sucheKontakte,
} from "./kontakte";
import { MOCK_OBJEKTE } from "./mockDaten";
import type { Objekt } from "./objekte";

const mitKontakten = (id: string, kontakte: Objekt["kontakte"]): Objekt => ({
  ...MOCK_OBJEKTE[0],
  id,
  kontakte,
});

describe("Kontaktregister", () => {
  test("Firma und Person werden nur bei Anrede getrennt", () => {
    expect(nameZerlegen("Brandt & Partner, Herr Ostermann")).toEqual({
      firma: "Brandt & Partner",
      name: "Herr Ostermann",
    });
    expect(nameZerlegen("Notariat Dr. Winterberg, Ulm")).toEqual({
      firma: null,
      name: "Notariat Dr. Winterberg, Ulm",
    });
    expect(anzeigename({ firma: "Brandt & Partner", name: "Herr Ostermann" })).toBe(
      "Brandt & Partner, Herr Ostermann",
    );
  });

  test("Dubletten über E-Mail, Telefon oder Namen werden ein Datensatz", () => {
    const a = mitKontakten("o1", [
      {
        id: "x1",
        rolle: "makler",
        name: "Brandt & Partner, Herr Ostermann",
        telefon: "0731 0000004",
        email: "o@b.de",
        notiz: null,
      },
    ]);
    const b = mitKontakten("o2", [
      {
        id: "x2",
        rolle: "makler",
        name: "Herr Ostermann (Brandt)",
        telefon: "0731/0000004",
        email: null,
        notiz: "zweites Objekt",
      },
      {
        id: "x3",
        rolle: "eigentuemer",
        name: "Familie Neu",
        telefon: null,
        email: null,
        notiz: null,
      },
    ]);
    const { objekte, register } = registerAbgleichen([a, b], []);
    expect(register).toHaveLength(2);
    const makler = register.find((r) => r.firma === "Brandt & Partner")!;
    expect(objekte[0].kontakte[0].kontaktId).toBe(makler.id);
    expect(objekte[1].kontakte[0].kontaktId).toBe(makler.id);
    // Die Kopie am Objekt folgt dem Register, die Objekt-Notiz bleibt.
    expect(objekte[1].kontakte[0].name).toBe("Brandt & Partner, Herr Ostermann");
    expect(objekte[1].kontakte[0].notiz).toBe("zweites Objekt");
    expect(makler.kategorien).toEqual(["Makler"]);
  });

  test("Änderung im Register zieht an allen Objekten nach", () => {
    const { objekte, register } = registerAbgleichen(
      [
        mitKontakten("o1", [
          {
            id: "x1",
            rolle: "notar",
            name: "Notariat Süd",
            telefon: null,
            email: null,
            notiz: null,
          },
        ]),
      ],
      [],
    );
    const neu = register.map((r) => ({ ...r, telefon: "0731 12345" }));
    expect(kopienAktualisieren(objekte[0], neu).kontakte[0].telefon).toBe("0731 12345");
  });

  test("Suche über Name, Firma und Telefon", () => {
    const { register } = registerAbgleichen(MOCK_OBJEKTE, []);
    expect(sucheKontakte(register, "brandt").length).toBeGreaterThan(0);
    expect(sucheKontakte(register, "0000004").length).toBeGreaterThan(0);
    expect(sucheKontakte(register, "x")).toHaveLength(0);
  });
});
