import { describe, expect, test } from "bun:test";

import { MOCK_OBJEKTE } from "./mockDaten";
import type { Objekt } from "./objekte";
import { pruefpunkteFuer, pruefstand, unterlagenFuer, warnungFuer } from "./pruefung";

const etw = (teil: Partial<Objekt> = {}): Objekt => ({
  ...MOCK_OBJEKTE.find((o) => o.objektart === "etw")!,
  stufe: "qualifiziert",
  denkmalschutz: false,
  erbbaurecht: false,
  pruefung: null,
  ...teil,
});

describe("Objektprüfung", () => {
  test("ETW mit WEG-Unterlagen, Haus ohne", () => {
    expect(unterlagenFuer(etw()).map((u) => u.id)).toContain("teilungserklaerung");
    const haus = etw({ objektart: "mfh" });
    expect(unterlagenFuer(haus).map((u) => u.id)).not.toContain("teilungserklaerung");
    expect(unterlagenFuer(haus).map((u) => u.id)).toContain("mietaufstellung");
    expect(pruefpunkteFuer(haus).map((p) => p.id)).not.toContain("hausgeld");
  });

  test("leere Prüfung: gelb, Denkmal/Erbbau vorbelegt ok", () => {
    const s = pruefstand(etw());
    expect(s.ampel).toBe("gelb");
    expect(s.erledigt).toBe(1);
    expect(s.gesamt).toBe(18);
  });

  test("kritisch macht rot, alles Pflichtige erledigt macht grün", () => {
    expect(
      pruefstand(etw({ pruefung: { punkte: { stellplatz: { status: "kritisch" } } } })).ampel,
    ).toBe("rot");

    const o = etw();
    const pruefung = {
      unterlagen: Object.fromEntries(
        unterlagenFuer(o)
          .filter((u) => u.pflicht)
          .map((u) => [u.id, { status: "liegt_vor" as const }]),
      ),
      punkte: Object.fromEntries(pruefpunkteFuer(o).map((p) => [p.id, { status: "ok" as const }])),
    };
    expect(pruefstand(etw({ pruefung })).ampel).toBe("gruen");
    expect(warnungFuer(etw({ pruefung }), "angebot")).toBeNull();
  });

  test("Warnung nur beim Wechsel ins Angebot oder in den Kauf", () => {
    expect(warnungFuer(etw(), "besichtigt")).toBeNull();
    expect(warnungFuer(etw(), "angebot")?.offenePflicht.length).toBeGreaterThan(0);
    expect(warnungFuer(etw(), "angekauft")).not.toBeNull();
    expect(warnungFuer(etw({ stufe: "angebot" }), "angebot")).toBeNull();
  });
});
