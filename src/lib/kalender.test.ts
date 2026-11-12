import { describe, expect, test } from "bun:test";

import { kalenderAdresse } from "./kalender";

describe("Google Kalender", () => {
  test("Einbettungs-Adresse aus der Kalender-ID", () => {
    const a = kalenderAdresse(" timo.birk@revest-projekt.de ", "AGENDA")!;
    expect(a.startsWith("https://calendar.google.com/calendar/embed?")).toBe(true);
    expect(a).toContain("src=timo.birk%40revest-projekt.de");
    expect(a).toContain("mode=AGENDA");
    expect(a).toContain("ctz=Europe%2FBerlin");
    expect(kalenderAdresse("  ")).toBeNull();
  });
});
