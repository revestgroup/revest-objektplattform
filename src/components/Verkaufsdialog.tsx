/**
 * Der Verkauf einer Einheit.
 *
 * Bisher war „verkauft" ein Eintrag im Status-Dropdown — und damit eine
 * Behauptung ohne Beleg: `kaeufer` und `verkaufspreis` standen im Modell, aber
 * keine Oberfläche hat sie je geschrieben. Ein Verkauf ist aber ein Vorgang,
 * bei dem vier Angaben gleichzeitig entstehen, und er zieht eine fünfte
 * Entscheidung nach sich: ob Revest eine Mietgarantie gibt.
 *
 * Genau dort hängt die Kette zusammen. Sagt Timo hier Ja, entsteht die Garantie
 * aus den Daten, die ohnehin schon dastehen — Adresse, Einheit, Käufer, Preis,
 * Kaltmiete. Getippt wird nur, was neu ist. Sagt er Nein, ist die Wohnung
 * verkauft und fertig; nicht jeder Käufer will eine Garantie.
 *
 * Was in Phase 2 dazukommt, braucht kein neues Feld, nur einen Auslöser: der
 * Kontakt des Käufers steht ab hier im Datensatz, also kann die Garantie- oder
 * Vertragsmail später von hier aus gehen.
 */
import { useMemo, useState } from "react";

import { f, type Einheit, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import {
  GARANTIEARTEN,
  LAUFZEITEN,
  LAUFZEIT_STANDARD,
  zimmerVorschlag,
  type Garantieart,
} from "../lib/vermietung";
import { useVermietung } from "../lib/vermietungStore";
import { Dialog, Leiste } from "./Dialog";
import { Segmente, Textfeld, Zahlfeld } from "./Felder";

function heute(): string {
  return new Date().toISOString().slice(0, 10);
}

function zahl(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? null : n;
}

export function Verkaufsdialog({
  objekt,
  einheit,
  schliessen,
}: {
  objekt: Objekt;
  einheit: Einheit;
  schliessen: () => void;
}) {
  const { einheitVerkaufen } = useObjekte();
  const { garantien, anlegen } = useVermietung();

  const [kaeufer, setKaeufer] = useState(einheit.kaeufer ?? "");
  const [kontakt, setKontakt] = useState(einheit.kaeuferKontakt ?? "");
  // Der geführte Preis ist der Wunschpreis aus dem Vertrieb. Fast immer der
  // richtige Startwert — und wenn nicht, steht er schon im Feld.
  const [preis, setPreis] = useState(
    einheit.verkaufspreis !== null ? String(einheit.verkaufspreis) : "",
  );
  const [datum, setDatum] = useState(einheit.verkauftAm?.slice(0, 10) ?? heute());
  const [versucht, setVersucht] = useState(false);

  // Die Garantie ist der Normalfall bei Revest, deshalb vorgewählt.
  const [garantie, setGarantie] = useState(true);
  const [art, setArt] = useState<Garantieart>(objekt.vertriebsweg === "wg" ? "wg" : "wohnung");
  const [laufzeitWahl, setLaufzeitWahl] = useState(String(LAUFZEIT_STANDARD));
  const [laufzeitFrei, setLaufzeitFrei] = useState(String(LAUFZEIT_STANDARD));
  const [miete, setMiete] = useState(einheit.kaltmiete ? String(einheit.kaltmiete) : "");
  const [zimmerAnzahl, setZimmerAnzahl] = useState(
    String(objekt.wgZimmer ?? einheit.zimmer ?? 4),
  );

  // Zwei Garantien auf dieselbe Einheit sind ein Fehler, kein Sonderfall.
  const schonVergeben = garantien.some((g) => g.einheitId === einheit.id);

  const monate = Math.max(1, Number(laufzeitWahl === "frei" ? laufzeitFrei : laufzeitWahl) || 0);
  const mieteWert = zahl(miete);

  const bis = useMemo(() => {
    const d = new Date(datum || heute());
    d.setMonth(d.getMonth() + monate);
    return d;
  }, [datum, monate]);

  const kaeuferFehler = versucht && !kaeufer.trim() ? "Ohne Käufer kein Verkauf." : "";
  const mieteFehler =
    versucht && garantie && !schonVergeben && (mieteWert === null || mieteWert <= 0)
      ? "Die garantierte Miete ist die Verpflichtung."
      : "";

  function bestaetigen() {
    setVersucht(true);
    if (!kaeufer.trim()) return;

    const garantieJetzt = garantie && !schonVergeben;
    if (garantieJetzt && (mieteWert === null || mieteWert <= 0)) return;

    const preisWert = zahl(preis);
    const alsIso = new Date(datum || heute()).toISOString();

    einheitVerkaufen(objekt.id, einheit.id, {
      kaeufer: kaeufer.trim(),
      kontakt: kontakt.trim() || null,
      preis: preisWert,
      datum: alsIso,
    });

    if (garantieJetzt) {
      const anzahl = Math.max(1, Number(zimmerAnzahl) || 1);
      anlegen({
        // Die Verknüpfung in den Bestand. Die Bezeichnungen liegen redundant
        // daneben, damit die Garantie bestehen bleibt, wenn das Objekt
        // irgendwann nicht mehr in der Pipeline geführt wird.
        objektId: objekt.id,
        einheitId: einheit.id,
        adresse: `${objekt.strasse}, ${objekt.plz} ${objekt.stadt}`,
        einheitTitel: einheit.geschoss
          ? `${einheit.bezeichnung} · ${einheit.geschoss}`
          : einheit.bezeichnung,
        art,
        kaeufer: kaeufer.trim(),
        kaeuferKontakt: kontakt.trim() || null,
        verkauftAm: alsIso,
        verkaufspreis: preisWert,
        // Die Garantie beginnt mit dem Verkauf, nicht mit dem Mietverhältnis.
        beginn: alsIso,
        laufzeitMonate: monate,
        garantiemiete: mieteWert ?? 0,
        sollmiete: art === "wg" ? null : (einheit.kaltmiete ?? mieteWert),
        zimmer: art === "wg" ? zimmerVorschlag(anzahl, mieteWert ?? 0) : [],
        notiz: null,
      });
    }

    schliessen();
  }

  return (
    <Dialog
      titel="Verkauf eintragen"
      unterzeile={`${einheit.bezeichnung} · ${objekt.strasse}, ${objekt.stadt}`}
      schliessen={schliessen}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Textfeld
          id="verkauf-kaeufer"
          label="Käufer"
          wert={kaeufer}
          setWert={setKaeufer}
          platzhalter="Fam. Özdemir"
          pflicht
          fehler={kaeuferFehler}
        />
        <Textfeld
          id="verkauf-kontakt"
          label="Kontakt"
          wert={kontakt}
          setWert={setKontakt}
          platzhalter="name@beispiel.de"
          hinweis="Der Weg, auf dem der Käufer später angeschrieben wird."
        />
        <Zahlfeld
          id="verkauf-preis"
          label="Verkaufspreis"
          wert={preis}
          setWert={setPreis}
          einheit="€"
          hinweis={
            einheit.verkaufspreis !== null ? "Vorbelegt aus dem geführten Preis." : undefined
          }
        />
        <div>
          <label htmlFor="verkauf-datum" className="mini-label block">
            Beurkundet am
          </label>
          <input
            id="verkauf-datum"
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="zahl mt-2 w-full rounded-xl border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none"
          />
        </div>
      </div>

      {/* ----- Mietgarantie ----- */}
      <div className="mt-7 border-t border-linie pt-6">
        <div className="mini-label">Mietgarantie</div>

        {schonVergeben ? (
          // Keine Sperre des Verkaufs, nur der Garantie: der Datensatz existiert
          // schon, ein zweiter wäre eine doppelte Verpflichtung.
          <p className="mt-3.5 rounded-xl bg-flaeche-hoch px-3.5 py-2.5 text-[0.72rem] leading-relaxed text-grau-stark">
            Für diese Einheit läuft bereits eine Garantie. Sie wird in der
            Mietverwaltung geändert, nicht hier.
          </p>
        ) : (
          <>
            <div className="mt-3.5">
              <Segmente
                label="Gibt Revest eine Mietgarantie?"
                wert={garantie ? "ja" : "nein"}
                setWert={(v) => setGarantie(v === "ja")}
                optionen={[
                  { wert: "ja", titel: "Ja" },
                  { wert: "nein", titel: "Nein" },
                ]}
              />
            </div>

            {garantie && (
              <div className="eintritt mt-6 grid gap-6 sm:grid-cols-2">
                <Segmente
                  label="Art"
                  wert={art}
                  setWert={setArt}
                  optionen={[
                    { wert: "wohnung" as const, titel: GARANTIEARTEN.wohnung.titel },
                    { wert: "wg" as const, titel: GARANTIEARTEN.wg.titel },
                  ]}
                />
                <Segmente
                  label="Laufzeit"
                  wert={laufzeitWahl}
                  setWert={setLaufzeitWahl}
                  optionen={[
                    ...LAUFZEITEN.map((m) => ({ wert: String(m), titel: `${m} Mon.` })),
                    { wert: "frei", titel: "Andere" },
                  ]}
                />
                {laufzeitWahl === "frei" && (
                  <Zahlfeld
                    id="verkauf-laufzeit"
                    label="Laufzeit in Monaten"
                    wert={laufzeitFrei}
                    setWert={setLaufzeitFrei}
                    schritt="1"
                    einheit="Mon."
                  />
                )}
                <Zahlfeld
                  id="verkauf-miete"
                  label="Garantiemiete je Monat"
                  wert={miete}
                  setWert={setMiete}
                  einheit="€"
                  pflicht
                  fehler={mieteFehler}
                  hinweis={einheit.kaltmiete ? "Vorbelegt aus der Kaltmiete." : undefined}
                />
                {art === "wg" && (
                  <Zahlfeld
                    id="verkauf-zimmer"
                    label="Zimmer in der WG"
                    wert={zimmerAnzahl}
                    setWert={setZimmerAnzahl}
                    schritt="1"
                    einheit="Zi."
                    hinweis="Werden gleich mit angelegt, Mieten gleichmäßig verteilt."
                  />
                )}

                {/* Die zwei Zahlen, die am Ende unterschrieben werden. Niemand
                    soll im Kopf rechnen, was eine Laufzeitänderung kostet. */}
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-linie bg-linie sm:col-span-2">
                  <div className="bg-flaeche px-4 py-3.5">
                    <dt className="mini-label !text-[0.52rem]">Garantie bis</dt>
                    <dd className="zahl mt-1.5 text-[0.9rem] font-semibold text-tinte">
                      {f.datum(bis.toISOString())}
                    </dd>
                  </div>
                  <div className="bg-flaeche px-4 py-3.5">
                    <dt className="mini-label !text-[0.52rem]">Verpflichtung</dt>
                    <dd className="zahl mt-1.5 text-[0.9rem] font-semibold text-tinte">
                      {f.eurKurz(monate * (mieteWert ?? 0))}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </>
        )}
      </div>

      <Leiste
        abbrechen={schliessen}
        bestaetigen={bestaetigen}
        titel="Verkauf eintragen"
        ton="gruen"
      />
    </Dialog>
  );
}
