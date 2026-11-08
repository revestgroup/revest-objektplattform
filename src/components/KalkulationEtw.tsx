/**
 * Kalkulation einer Eigentumswohnung — der Reiter „Kalkulation“ im Ankauf.
 *
 * Aufbau von oben nach unten in der Reihenfolge, in der Timo liest: erst das
 * Ergebnis in drei Szenarien, dann die Bankansicht, dann die Eingaben, ganz
 * unten der Aufwertungskatalog, aus dem die Kostenschätzung kommt.
 *
 * Jedes Feld zeigt seine Vorgabe als Platzhalter. Wer nichts einträgt, rechnet
 * mit der Vorgabe aus den Einstellungen; wer etwas einträgt, überschreibt sie
 * nur für dieses Objekt. Ein Klick auf „Vorgabe“ nimmt das zurück.
 */
import { ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";

import { useEinstellungen } from "../lib/einstellungenStore";
import {
  AUFWERTUNGSKATALOG,
  MARKTQUELLEN,
  SZENARIEN,
  SZENARIO_TITEL,
  KATALOG_PREISE,
  berechneEtw,
  etwEingabe,
  katalogPreis,
  katalogSumme,
  positionsBetrag,
  type EtwKalkulation,
  type EtwVorgaben,
  type Gewerk,
  type Szenario,
} from "../lib/kalkulationEtw";
import { BUNDESLAND_NAMEN, GRUNDERWERBSTEUER, f, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";

function zahlAus(s: string): number | null {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? null : n;
}

/* ------------------------------------------------------------------ */
/* Bausteine                                                            */
/* ------------------------------------------------------------------ */

/**
 * Zahlenfeld mit Vorgabe. Leer heißt „Vorgabe gilt“ — die steht als
 * Platzhalter im Feld, damit man sieht, womit gerechnet wird.
 */
export function Vorgabefeld({
  id,
  label,
  wert,
  vorgabe,
  setWert,
  einheit,
  hinweis,
  schmal,
}: {
  id: string;
  label: string;
  wert: number | null | undefined;
  vorgabe: number;
  setWert: (v: number | null) => void;
  einheit: "€" | "%" | "Mon." | "€/M";
  hinweis?: string;
  schmal?: boolean;
}) {
  const [text, setText] = useState(wert === null || wert === undefined ? "" : String(wert));
  const ueberschrieben = wert !== null && wert !== undefined;
  const platzhalter =
    einheit === "€" || einheit === "€/M"
      ? new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(vorgabe)
      : String(vorgabe).replace(".", ",");

  return (
    <div className={cn(schmal && "max-w-[11rem]")}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="mini-label block">
          {label}
        </label>
        {ueberschrieben && (
          <button
            type="button"
            onClick={() => {
              setText("");
              setWert(null);
            }}
            title="Vorgabe wiederherstellen"
            className="druckbar flex items-center gap-1 rounded-full text-[0.58rem] text-grau hover:text-tinte"
          >
            <RotateCcw size={9} strokeWidth={2} />
            Vorgabe
          </button>
        )}
      </div>
      <div className="relative mt-1.5">
        <input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setWert(zahlAus(e.target.value));
          }}
          placeholder={platzhalter}
          className={cn(
            "zahl w-full rounded-xl border bg-flaeche px-3 py-2 pr-12 text-[0.8rem] text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none",
            ueberschrieben ? "border-linie-stark" : "border-linie",
          )}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.64rem] text-grau">
          {einheit}
        </span>
      </div>
      {hinweis && <p className="mt-1 text-[0.6rem] leading-relaxed text-grau">{hinweis}</p>}
    </div>
  );
}

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mini-label">{titel}</div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reiter                                                               */
/* ------------------------------------------------------------------ */

export function KalkulationEtwBlatt({ objekt }: { objekt: Objekt }) {
  const { vorgaben } = useEinstellungen();
  const { aendern } = useObjekte();
  const kalk: EtwKalkulation = objekt.kalkulationEtw ?? {};
  const eingabe = etwEingabe(objekt, vorgaben);
  const e = berechneEtw(eingabe);
  const katalog = katalogSumme(kalk, vorgaben, eingabe.wohnflaeche);

  function setze(teil: Partial<EtwKalkulation>) {
    aendern(objekt.id, { kalkulationEtw: { ...kalk, ...teil } });
  }

  const fehlt = [
    objekt.kaufpreis === null && "Kaufpreis",
    !objekt.wohnflaeche && "Wohnfläche",
  ].filter(Boolean);
  const grestVorgabe = GRUNDERWERBSTEUER[objekt.bundesland] ?? 5;

  return (
    <div className="flex flex-col gap-10 px-6 py-8 md:px-9">
      {fehlt.length > 0 && (
        <p className="rounded-xl border border-[#EFD9A6] bg-[#FDF8EC] px-3.5 py-2.5 text-[0.74rem] text-grau-stark">
          {fehlt.join(" und ")} fehlt am Objekt — bitte über „Bearbeiten“ nachtragen, sonst rechnet
          die Kalkulation mit 0.
        </p>
      )}

      {/* ----- Ergebnis ----- */}
      <section>
        <div className="mini-label">Ergebnis</div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-linie bg-flaeche">
          <table className="w-full min-w-[34rem] text-[0.78rem]">
            <thead>
              <tr className="border-b border-linie text-left">
                <th className="px-4 py-3 font-normal text-grau" />
                {SZENARIEN.map((s) => (
                  <th key={s} className="px-3 py-3 text-right">
                    <span className="mini-label">{SZENARIO_TITEL[s]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="zahl">
              <tr className="border-b border-linie">
                <td className="px-4 py-2 text-grau">Verkaufspreis</td>
                {SZENARIEN.map((s) => (
                  <td key={s} className="px-2 py-1.5">
                    <Verkaufsfeld
                      szenario={s}
                      wert={kalk.verkauf?.[s] ?? null}
                      setWert={(v) => setze({ verkauf: { ...kalk.verkauf, [s]: v } })}
                    />
                  </td>
                ))}
              </tr>
              <Zeile titel="Kaufpreis" werte={SZENARIEN.map(() => eingabe.kaufpreis)} />
              <Zeile titel="Ankaufsnebenkosten" werte={SZENARIEN.map(() => e.ankaufsnebenkosten)} />
              <Zeile titel="Aufwertung" werte={SZENARIEN.map(() => e.aufwertung)} />
              <Zeile titel="Bewirtschaftung" werte={SZENARIEN.map(() => e.bewirtschaftung)} />
              <Zeile titel="Vermarktung" werte={SZENARIEN.map((s) => e.szenarien[s].vermarktung)} />
              <Zeile titel="Finanzierungskosten" werte={SZENARIEN.map(() => e.finanzierungskosten)} />
              <Zeile
                titel="Gesamtinvestition"
                werte={SZENARIEN.map((s) => e.szenarien[s].gesamtinvestition)}
                stark
                linie
              />
              <tr className="border-t border-linie">
                <td className="px-4 py-2.5 font-semibold text-tinte">Gewinn vor Steuer</td>
                {SZENARIEN.map((s) => {
                  const g = e.szenarien[s].gewinn;
                  return (
                    <td
                      key={s}
                      className={cn(
                        "px-3 py-2.5 text-right font-semibold",
                        g === null ? "text-grau" : g < 0 ? "text-[#CF4848]" : "text-[#17935C]",
                      )}
                    >
                      {f.eur(g)}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="px-4 py-2 text-grau">Gewinn in %</td>
                {SZENARIEN.map((s) => (
                  <td key={s} className="px-3 py-2 text-right text-grau-stark">
                    {f.prozent(e.szenarien[s].gewinnProzent)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 text-grau">
                  €/m² Verkauf
                  <span className="block text-[0.6rem] text-linie-stark">
                    nach {f.eur(eingabe.abzugQm)} Abzug
                  </span>
                </td>
                {SZENARIEN.map((s) => (
                  <td key={s} className="px-3 py-2 text-right text-grau-stark">
                    {f.eur(e.szenarien[s].preisJeQm)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ----- Bank ----- */}
      <section>
        <div className="mini-label">Ansicht Bank · Mid-Case</div>
        <dl className="mt-3 max-w-md rounded-2xl border border-linie bg-flaeche px-4 py-2 text-[0.76rem]">
          {(
            [
              ["Kaufpreis", eingabe.kaufpreis],
              [`Grunderwerbsteuer ${f.prozent(eingabe.grestProzent)}`, e.grest],
              [`Notar/Grundbuch ${f.prozent(eingabe.notarProzent)}`, e.notar],
              [`Makler Ankauf ${f.prozent(eingabe.maklerAnkaufProzent)}`, e.maklerAnkauf],
              ["Aufwertung", e.aufwertung],
              ["Bewirtschaftung", e.bewirtschaftung],
              ["Zinsen Bank", e.zinsenBank],
              ["Bearbeitungsgebühr", e.gebuehrBank],
              ["Kosten Co-Investor", e.kostenCo],
              ["Vermarktung", e.szenarien.mid.vermarktung],
            ] as [string, number][]
          ).map(([titel, wert]) => (
            <div key={titel} className="flex justify-between gap-4 py-1">
              <dt className="text-grau">{titel}</dt>
              <dd className="zahl text-grau-stark">{f.eur(wert)}</dd>
            </div>
          ))}
          <div className="mt-1 flex justify-between gap-4 border-t border-linie py-1.5 font-semibold">
            <dt className="text-tinte">Gesamtinvestition</dt>
            <dd className="zahl text-tinte">{f.eur(e.szenarien.mid.gesamtinvestition)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-grau">Verkaufspreis</dt>
            <dd className="zahl text-grau-stark">{f.eur(e.szenarien.mid.verkaufspreis)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-1 font-semibold">
            <dt className="text-tinte">Gewinn vor Steuer</dt>
            <dd className="zahl text-tinte">
              {f.eur(e.szenarien.mid.gewinn)} · {f.prozent(e.szenarien.mid.gewinnProzent)}
            </dd>
          </div>
        </dl>
      </section>

      {/* ----- Eingaben ----- */}
      <section className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        <Abschnitt titel="Ankauf">
          <div>
            <div className="mini-label">Kaufpreis</div>
            <div className="zahl mt-1.5 rounded-xl border border-dashed border-linie px-3 py-2 text-[0.8rem] text-grau-stark">
              {f.eur(objekt.kaufpreis)}
            </div>
            <p className="mt-1 text-[0.6rem] text-grau">aus dem Objekt</p>
          </div>
          <Vorgabefeld
            id="k-grest"
            label="Grunderwerbsteuer"
            wert={kalk.grestProzent}
            vorgabe={grestVorgabe}
            setWert={(v) => setze({ grestProzent: v })}
            einheit="%"
            hinweis={BUNDESLAND_NAMEN[objekt.bundesland]}
          />
          <Vorgabefeld
            id="k-notar"
            label="Notar/Grundbuch"
            wert={kalk.notarProzent}
            vorgabe={vorgaben.notarProzent}
            setWert={(v) => setze({ notarProzent: v })}
            einheit="%"
          />
          <Vorgabefeld
            id="k-makler"
            label="Maklerprovision"
            wert={kalk.maklerAnkaufProzent}
            vorgabe={objekt.maklerprovision ?? vorgaben.maklerAnkaufProzent}
            setWert={(v) => setze({ maklerAnkaufProzent: v })}
            einheit="%"
          />
        </Abschnitt>

        <Abschnitt titel="Aufwertung und Bewirtschaftung">
          <Vorgabefeld
            id="k-aufwertung"
            label="Kostenschätzung"
            wert={kalk.aufwertungManuell}
            vorgabe={katalog.gesamt}
            setWert={(v) => setze({ aufwertungManuell: v })}
            einheit="€"
            hinweis="Summe aus dem Katalog unten, überschreibbar"
          />
          <Vorgabefeld
            id="k-monate"
            label="Dauer inkl. Verkauf"
            wert={kalk.monate}
            vorgabe={vorgaben.monate}
            setWert={(v) => setze({ monate: v })}
            einheit="Mon."
          />
          <Vorgabefeld
            id="k-bewirtschaftung"
            label="Bewirtschaftung"
            wert={kalk.bewirtschaftungMonat}
            vorgabe={vorgaben.bewirtschaftungMonat}
            setWert={(v) => setze({ bewirtschaftungMonat: v })}
            einheit="€/M"
          />
        </Abschnitt>

        <Abschnitt titel="Finanzierung Bank">
          <Vorgabefeld
            id="k-fin"
            label="Finanzierungsbetrag"
            wert={kalk.finanzierungsbetrag}
            vorgabe={eingabe.kaufpreis}
            setWert={(v) => setze({ finanzierungsbetrag: v })}
            einheit="€"
            hinweis="Vorgabe: Kaufpreis"
          />
          <Vorgabefeld
            id="k-zins"
            label="Zinssatz p. a."
            wert={kalk.zinsBankProzent}
            vorgabe={vorgaben.zinsBankProzent}
            setWert={(v) => setze({ zinsBankProzent: v })}
            einheit="%"
          />
          <Vorgabefeld
            id="k-gebuehr"
            label="Bearbeitungsgebühr"
            wert={kalk.gebuehrBankProzent}
            vorgabe={vorgaben.gebuehrBankProzent}
            setWert={(v) => setze({ gebuehrBankProzent: v })}
            einheit="%"
          />
        </Abschnitt>

        <Abschnitt titel="Co-Investor">
          <Vorgabefeld
            id="k-co"
            label="Kapitaleinsatz"
            wert={kalk.coKapital}
            vorgabe={0}
            setWert={(v) => setze({ coKapital: v })}
            einheit="€"
          />
          <Vorgabefeld
            id="k-cozins"
            label="Zinssatz p. a."
            wert={kalk.zinsCoProzent}
            vorgabe={vorgaben.zinsCoProzent}
            setWert={(v) => setze({ zinsCoProzent: v })}
            einheit="%"
          />
        </Abschnitt>

        <Abschnitt titel="Vermarktung und Verkauf">
          <Vorgabefeld
            id="k-maklerverkauf"
            label="Makler Verkauf"
            wert={kalk.maklerVerkaufProzent}
            vorgabe={vorgaben.maklerVerkaufProzent}
            setWert={(v) => setze({ maklerVerkaufProzent: v })}
            einheit="%"
          />
          <Vorgabefeld
            id="k-staging"
            label="Home Staging"
            wert={kalk.homeStaging}
            vorgabe={vorgaben.homeStaging}
            setWert={(v) => setze({ homeStaging: v })}
            einheit="€"
          />
          <Vorgabefeld
            id="k-abzug"
            label="Abzug für €/m²-Betrachtung"
            wert={kalk.abzugQm}
            vorgabe={vorgaben.abzugQm}
            setWert={(v) => setze({ abzugQm: v })}
            einheit="€"
            hinweis="z. B. Stellplatz/TG"
          />
        </Abschnitt>

        <Abschnitt titel="Marktwert">
          {MARKTQUELLEN.map((q) => {
            const w = kalk.marktwerte?.[q.id] ?? null;
            return (
              <div key={q.id}>
                <Vorgabefeld
                  id={`k-markt-${q.id}`}
                  label={q.titel}
                  wert={w}
                  vorgabe={0}
                  setWert={(v) => setze({ marktwerte: { ...kalk.marktwerte, [q.id]: v } })}
                  einheit="€"
                />
                <p className="zahl mt-1 text-[0.6rem] text-grau">
                  {w && eingabe.wohnflaeche ? `${f.eur(w / eingabe.wohnflaeche)} / m²` : " "}
                </p>
              </div>
            );
          })}
        </Abschnitt>
      </section>

      {/* ----- Katalog ----- */}
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <div className="mini-label">Aufwertungskatalog</div>
          <div className="zahl text-[0.8rem] font-semibold text-tinte">{f.eur(katalog.gesamt)}</div>
        </div>
        {kalk.aufwertungManuell !== null && kalk.aufwertungManuell !== undefined && (
          <p className="mt-1 text-[0.64rem] text-grau">
            Die Kalkulation rechnet mit der überschriebenen Kostenschätzung von{" "}
            {f.eur(kalk.aufwertungManuell)}.
          </p>
        )}
        <div className="mt-3 divide-y divide-linie overflow-hidden rounded-2xl border border-linie bg-flaeche">
          {AUFWERTUNGSKATALOG.map((g) => (
            <Gewerkzeile
              key={g.id}
              gewerk={g}
              summe={katalog.jeGewerk[g.id] ?? 0}
              kalk={kalk}
              vorgaben={vorgaben}
              wohnflaeche={eingabe.wohnflaeche}
              setze={setze}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Zeile({
  titel,
  werte,
  stark,
  linie,
}: {
  titel: string;
  werte: (number | null)[];
  stark?: boolean;
  linie?: boolean;
}) {
  return (
    <tr className={cn(linie && "border-t border-linie")}>
      <td className={cn("px-4 py-1.5", stark ? "font-semibold text-tinte" : "text-grau")}>{titel}</td>
      {werte.map((w, i) => (
        <td
          key={i}
          className={cn("px-3 py-1.5 text-right", stark ? "font-semibold text-tinte" : "text-grau-stark")}
        >
          {f.eur(w)}
        </td>
      ))}
    </tr>
  );
}

function Verkaufsfeld({
  szenario,
  wert,
  setWert,
}: {
  szenario: Szenario;
  wert: number | null;
  setWert: (v: number | null) => void;
}) {
  const [text, setText] = useState(wert === null ? "" : String(wert));
  return (
    <input
      inputMode="decimal"
      aria-label={`Verkaufspreis ${SZENARIO_TITEL[szenario]}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        setWert(zahlAus(e.target.value));
      }}
      placeholder="—"
      className="zahl w-full rounded-lg border border-linie bg-grund px-2 py-1.5 text-right text-[0.8rem] font-semibold text-tinte focus:border-linie-stark focus:outline-none"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Katalog                                                              */
/* ------------------------------------------------------------------ */

function Gewerkzeile({
  gewerk,
  summe,
  kalk,
  vorgaben,
  wohnflaeche,
  setze,
}: {
  gewerk: Gewerk;
  summe: number;
  kalk: EtwKalkulation;
  vorgaben: EtwVorgaben;
  wohnflaeche: number;
  setze: (teil: Partial<EtwKalkulation>) => void;
}) {
  // Gewerke mit Inhalt stehen offen, leere bleiben zu — sonst sind es 102 Zeilen.
  const [offen, setOffen] = useState(summe > 0);

  function menge(id: string, v: number) {
    const katalog = { ...kalk.katalog };
    if (v) katalog[id] = v;
    else delete katalog[id];
    setze({ katalog });
  }

  function preis(id: string, v: number | null) {
    const preise = { ...kalk.preise };
    if (v === null) delete preise[id];
    else preise[id] = v;
    setze({ preise });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        className="druckbar flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn("shrink-0 text-grau transition-transform duration-200 ease-out-stark", !offen && "-rotate-90")}
        />
        <span className={cn("min-w-0 flex-1 truncate text-[0.8rem]", summe > 0 ? "text-tinte" : "text-grau")}>
          {gewerk.titel}
        </span>
        <span className={cn("zahl shrink-0 text-[0.74rem]", summe > 0 ? "text-grau-stark" : "text-linie-stark")}>
          {f.eur(summe)}
        </span>
      </button>

      {offen && (
        <ul className="flex flex-col gap-1 px-3 pb-3">
          {gewerk.positionen.map((p) => {
            const m = kalk.katalog?.[p.id] ?? 0;
            const pr = katalogPreis(p.id, vorgaben, kalk);
            const betrag = positionsBetrag(p, m, pr, wohnflaeche);
            return (
              <li
                key={p.id}
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 sm:grid-cols-[1fr_7rem_7rem_6rem]",
                  m ? "bg-flaeche-hoch" : "",
                )}
              >
                <span className="min-w-0 text-[0.74rem] text-grau-stark">{p.titel}</span>
                <span className="justify-self-end sm:justify-self-stretch">
                  {p.art === "menge" ? (
                    <span className="relative block">
                      <input
                        inputMode="decimal"
                        aria-label={`${p.titel} Menge`}
                        value={m || ""}
                        onChange={(e) => menge(p.id, zahlAus(e.target.value) ?? 0)}
                        placeholder="0"
                        className="zahl w-24 rounded-lg border border-linie bg-grund px-2 py-1 pr-9 text-right text-[0.74rem] text-tinte focus:border-linie-stark focus:outline-none sm:w-full"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[0.58rem] text-grau">
                        {p.einheit}
                      </span>
                    </span>
                  ) : (
                    <label className="flex items-center gap-2 text-[0.7rem] text-grau-stark">
                      <input
                        type="checkbox"
                        checked={m > 0}
                        onChange={(e) => menge(p.id, e.target.checked ? 1 : 0)}
                        className="size-4 accent-[#17935C]"
                      />
                      {p.art === "flaeche" ? "Ja × m²" : "Ja"}
                    </label>
                  )}
                </span>
                <Preisfeld
                  titel={p.titel}
                  wert={kalk.preise?.[p.id] ?? null}
                  vorgabe={vorgaben.preise[p.id] ?? KATALOG_PREISE[p.id]}
                  setWert={(v) => preis(p.id, v)}
                  zusatz={p.art === "flaeche" ? "/m²" : p.art === "menge" ? `/${p.einheit}` : ""}
                />
                <span className="zahl justify-self-end text-[0.74rem] text-tinte">{betrag ? f.eur(betrag) : ""}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Preisfeld({
  titel,
  wert,
  vorgabe,
  setWert,
  zusatz,
}: {
  titel: string;
  wert: number | null;
  vorgabe: number;
  setWert: (v: number | null) => void;
  zusatz: string;
}) {
  const [text, setText] = useState(wert === null ? "" : String(wert));
  return (
    <span className="relative block">
      <input
        inputMode="decimal"
        aria-label={`${titel} Preis`}
        title="Preis für dieses Objekt — leer lassen für den Standardpreis"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setWert(zahlAus(e.target.value));
        }}
        placeholder={new Intl.NumberFormat("de-DE").format(vorgabe)}
        className={cn(
          "zahl w-24 rounded-lg border bg-grund px-2 py-1 pr-10 text-right text-[0.7rem] text-grau-stark placeholder:text-grau focus:border-linie-stark focus:outline-none sm:w-full",
          wert !== null ? "border-linie-stark" : "border-linie",
        )}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[0.56rem] text-grau">
        €{zusatz}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Einstellungen                                                        */
/* ------------------------------------------------------------------ */

/**
 * Die Standardwerte für alle Objekte. Leeres Feld heißt: Wert aus
 * `KALKULATION_ETW.md`. Preise je Position sind eingeklappt — man ändert
 * selten mehr als zwei auf einmal.
 */
export function KalkulationsVorgaben() {
  const { vorgaben, vorgabenSetzen, preisSetzen, vorgabenZuruecksetzen } = useEinstellungen();
  const [preiseOffen, setPreiseOffen] = useState(false);
  // Schlüssel beim Zurücksetzen wechseln, damit die Felder ihren Text verlieren.
  const [runde, setRunde] = useState(0);

  const felder: [keyof Omit<EtwVorgaben, "preise">, string, "€" | "%" | "Mon." | "€/M", number][] = [
    ["notarProzent", "Notar/Grundbuch", "%", 2],
    ["maklerAnkaufProzent", "Maklerprovision Ankauf", "%", 0],
    ["monate", "Dauer der Maßnahme", "Mon.", 4],
    ["bewirtschaftungMonat", "Bewirtschaftung", "€/M", 100],
    ["zinsBankProzent", "Zinssatz Bank", "%", 5.5],
    ["gebuehrBankProzent", "Bearbeitungsgebühr", "%", 1.5],
    ["zinsCoProzent", "Zinssatz Co-Investor", "%", 8],
    ["maklerVerkaufProzent", "Makler Verkauf", "%", 0],
    ["homeStaging", "Home Staging", "€", 0],
    ["abzugQm", "Abzug für €/m²", "€", 30_000],
  ];

  return (
    <div key={runde}>
      <div className="mt-5 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        {felder.map(([schluessel, titel, einheit, standard]) => (
          <Vorgabefeld
            key={schluessel}
            id={`v-${schluessel}`}
            label={titel}
            wert={vorgaben[schluessel] === standard ? null : vorgaben[schluessel]}
            vorgabe={standard}
            setWert={(v) => vorgabenSetzen({ [schluessel]: v ?? standard })}
            einheit={einheit}
          />
        ))}
      </div>
      <p className="mt-3 text-[0.64rem] text-grau">
        Grunderwerbsteuer kommt aus dem Bundesland des Objekts, der Finanzierungsbetrag aus dem
        Kaufpreis.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPreiseOffen((o) => !o)}
          aria-expanded={preiseOffen}
          className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2 text-[0.64rem] font-medium tracking-[0.12em] uppercase text-tinte"
        >
          <ChevronDown size={12} strokeWidth={2} className={cn(!preiseOffen && "-rotate-90")} />
          Katalogpreise
          {Object.keys(vorgaben.preise).length > 0 && (
            <span className="zahl text-grau">· {Object.keys(vorgaben.preise).length} geändert</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            vorgabenZuruecksetzen();
            setRunde((r) => r + 1);
          }}
          className="druckbar flex items-center gap-2 rounded-full border border-linie px-4 py-2 text-[0.64rem] font-medium tracking-[0.12em] uppercase text-grau-stark"
        >
          <RotateCcw size={11} strokeWidth={2} />
          Auf Vorlage zurücksetzen
        </button>
      </div>

      {preiseOffen && (
        <div className="mt-4 flex max-w-3xl flex-col gap-5">
          {AUFWERTUNGSKATALOG.map((g) => (
            <div key={g.id}>
              <div className="mini-label">{g.titel}</div>
              <ul className="mt-2 flex flex-col gap-1">
                {g.positionen.map((p) => (
                  <li key={p.id} className="grid grid-cols-[1fr_8rem] items-center gap-3">
                    <span className="text-[0.74rem] text-grau-stark">{p.titel}</span>
                    <Preisfeld
                      titel={p.titel}
                      wert={vorgaben.preise[p.id] ?? null}
                      vorgabe={p.preis}
                      setWert={(v) => preisSetzen(p.id, v)}
                      zusatz={p.art === "flaeche" ? "/m²" : p.art === "menge" ? `/${p.einheit}` : ""}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
