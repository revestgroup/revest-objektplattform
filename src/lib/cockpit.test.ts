import { describe, expect, test } from "bun:test";

import {
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
