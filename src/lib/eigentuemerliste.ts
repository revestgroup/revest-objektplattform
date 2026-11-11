/**
 * Eigentümerliste WEG einlesen: aus Excel oder PDF kopierter Text, eine Zeile
 * je Eigentümer. Erkannt werden Tab, Semikolon oder „ | “ als Trenner; eine
 * Kopfzeile („Name“, „Anschrift“, „WE“) wird übersprungen. Wie überall gilt:
 * lieber leer als falsch — was nicht sicher ist, trägt man von Hand nach.
 *
 * Phase 2: dieselbe Struktur füllt das KI-Auslesen der Datei.
 */
import type { Eigentuemereintrag } from "./objekte";

let zaehler = 0;
export function neueEigentuemerId(): string {
  zaehler += 1;
  return `eig-${Date.now().toString(36)}-${zaehler}`;
}

const KOPF = /^(name|eigentümer|eigentuemer)\b/i;

/** „WE 3“, „Nr. 3“, „3“, „W3“ → „3“. */
function weNummer(t: string): string | null {
  const m = t.match(/^(?:we|w|nr\.?|wohnung)?\s*(\d{1,3}[a-z]?)$/i);
  return m ? m[1] : null;
}

export function eigentuemerAuslesen(
  text: string,
  vorgabe: { quelle: string | null; angabeAm: string | null },
): Eigentuemereintrag[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((z) => z.trim())
    .filter((z) => z && !KOPF.test(z))
    .map((zeile) => {
      const teile = zeile
        .split(/\t|;|\s\|\s/)
        .map((t) => t.trim())
        .filter(Boolean);
      // Die WE-Nummer darf an jeder Stelle stehen.
      const weIndex = teile.findIndex((t) => weNummer(t) !== null);
      const we = weIndex >= 0 ? weNummer(teile[weIndex]) : null;
      const rest = teile.filter((_, i) => i !== weIndex);
      const nichtGewuenscht = rest.some((t) => /kein(e)?\s+kontakt|nicht\s+gew/i.test(t));
      const ohneVermerk = rest.filter((t) => !/kein(e)?\s+kontakt|nicht\s+gew/i.test(t));
      return {
        id: neueEigentuemerId(),
        name: ohneVermerk[0] ?? "",
        anschrift: ohneVermerk.slice(1).join(", ") || null,
        weNr: we,
        kontaktNichtGewuenscht: nichtGewuenscht,
        quelle: vorgabe.quelle,
        angabeAm: vorgabe.angabeAm,
        kontaktId: null,
      };
    })
    .filter((e) => e.name);
}
