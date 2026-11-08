/**
 * Kalkulation einer Eigentumswohnung im Excel-Stil — nach dem freigegebenen
 * Entwurf `docs/planung/entwurf_kalkulation.dc.html`.
 *
 * Links die Eingaben in den Abschnitten 1–8 der Excel, je Zeile das Ergebnis
 * rechts daneben. Rechts das Ergebnis Worst/Mid/Best, das beim Scrollen
 * stehen bleibt. Darunter, in voller Breite, der Aufwertungskatalog.
 *
 * Gelb = Eingabe, weiß = berechnet. Ein leeres gelbes Feld rechnet mit der
 * Vorgabe aus den Einstellungen; die steht grau als Platzhalter darin.
 */
import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { useEinstellungen } from "../lib/einstellungenStore";
import {
  AUFWERTUNGSKATALOG,
  KATALOG_PREISE,
  MARKTQUELLEN,
  SZENARIEN,
  SZENARIO_TITEL,
  berechneEtw,
  etwEingabe,
  katalogPreis,
  katalogSumme,
  positionsBetrag,
  type EtwKalkulation,
  type EtwVorgaben,
} from "../lib/kalkulationEtw";
import { BUNDESLAND_NAMEN, GRUNDERWERBSTEUER, f, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/* Zahlen lesen und schreiben                                           */
/* ------------------------------------------------------------------ */

/**
 * Deutsch eingetippt: „185.000“, „5,5“, „1.234,50 €“. Ein Punkt ist nur dann
 * Tausendertrenner, wenn er so aussieht — „5.5“ bleibt fünfeinhalb.
 */
export function zahlLesen(roh: string): number | null {
  let s = roh.trim().replace(/\s/g, "").replace(/[€%]/g, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const GANZ = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const DEZIMAL = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

/** Beträge mit Tausenderpunkt, Prozente mit Komma. */
function zahlZeigen(v: number, art: "betrag" | "satz" | "jahr"): string {
  if (art === "jahr") return String(v);
  return art === "betrag" ? GANZ.format(v) : DEZIMAL.format(v);
}

/**
 * Gelbes Eingabefeld. Beim Tippen roh, nach dem Verlassen formatiert
 * („545000“ wird „545.000“). Leer heißt: Vorgabe gilt — sie steht grau darin.
 */
function Eingabe({
  wert,
  vorgabe,
  setWert,
  art,
  label,
  breite = "w-full",
}: {
  wert: number | null | undefined;
  vorgabe?: number | null;
  setWert: (v: number | null) => void;
  art: "betrag" | "satz" | "jahr";
  label: string;
  breite?: string;
}) {
  const [fokus, setFokus] = useState(false);
  const [text, setText] = useState("");
  const gesetzt = wert !== null && wert !== undefined;

  return (
    <input
      inputMode="decimal"
      aria-label={label}
      value={fokus ? text : gesetzt ? zahlZeigen(wert, art) : ""}
      placeholder={vorgabe !== null && vorgabe !== undefined ? zahlZeigen(vorgabe, art) : ""}
      onFocus={() => {
        setText(gesetzt ? zahlZeigen(wert, art) : "");
        setFokus(true);
      }}
      onChange={(e) => {
        setText(e.target.value);
        setWert(zahlLesen(e.target.value));
      }}
      onBlur={() => setFokus(false)}
      className={cn(
        "zahl h-6 rounded-md border border-[#F0D58A] bg-[#FFF8E1] px-2 text-right text-[0.8rem] text-tinte placeholder:text-grau focus:bg-flaeche focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-tinte",
        breite,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Zeilen                                                               */
/* ------------------------------------------------------------------ */

function Karte({
  titel,
  hinweis,
  children,
}: {
  titel: string;
  hinweis?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-linie bg-flaeche">
      <div className="px-2.5 pt-3.5 pb-1.5 text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-grau">
        {titel}
      </div>
      {children}
      {hinweis && (
        <p className="px-2.5 pt-1.5 pb-2.5 text-[0.66rem] leading-relaxed text-grau">{hinweis}</p>
      )}
    </section>
  );
}

/** Eingabezeile: Bezeichnung · Feld mit Einheit · Ergebnis. */
function Zeile({
  label,
  einheit,
  ergebnis,
  ueberschrieben,
  zuruecksetzen,
  titel,
  children,
}: {
  label: string;
  einheit?: string;
  ergebnis?: string;
  ueberschrieben?: boolean;
  zuruecksetzen?: () => void;
  titel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[30px] grid-cols-[46%_22%_32%] items-center border-b border-linie text-[0.8rem] last:border-b-0">
      <div title={titel ?? label} className="truncate px-2.5 text-grau-stark">
        {label}
      </div>
      <div className="flex items-center gap-1.5 px-2.5">
        {children}
        {einheit !== undefined && (
          <span className="w-8 shrink-0 text-[0.66rem] text-grau">{einheit}</span>
        )}
        {ueberschrieben && zuruecksetzen && (
          <button
            type="button"
            onClick={zuruecksetzen}
            title="Vorgabe wiederherstellen"
            aria-label={`${label}: Vorgabe wiederherstellen`}
            className="druckbar -ml-1 shrink-0 text-grau hover:text-tinte"
          >
            <RotateCcw size={10} strokeWidth={2} />
          </button>
        )}
      </div>
      <div className="zahl truncate px-2.5 text-right text-tinte">{ergebnis ?? ""}</div>
    </div>
  );
}

function Summenzeile({
  label,
  wert,
  stark = true,
}: {
  label: string;
  wert: string;
  stark?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid min-h-[30px] grid-cols-[46%_22%_32%] items-center border-b border-linie text-[0.8rem] last:border-b-0",
        stark && "border-t border-t-linie-stark font-bold",
      )}
    >
      <div className="truncate px-2.5 text-tinte">{label}</div>
      <div />
      <div className="zahl px-2.5 text-right text-tinte">{wert}</div>
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
  const [alleZeigen, setAlleZeigen] = useState(false);

  function setze(teil: Partial<EtwKalkulation>) {
    aendern(objekt.id, { kalkulationEtw: { ...kalk, ...teil } });
  }

  /** Vorgabefeld: leer = Vorgabe, gesetzt = für dieses Objekt überschrieben. */
  function vorgabe<K extends keyof EtwKalkulation>(
    schluessel: K,
    label: string,
    art: "betrag" | "satz",
    standard: number,
  ) {
    const wert = kalk[schluessel] as number | null | undefined;
    return {
      ueberschrieben: wert !== null && wert !== undefined,
      zuruecksetzen: () => setze({ [schluessel]: null } as Partial<EtwKalkulation>),
      feld: (
        <Eingabe
          label={label}
          art={art}
          wert={wert}
          vorgabe={standard}
          setWert={(v) => setze({ [schluessel]: v } as Partial<EtwKalkulation>)}
        />
      ),
    };
  }

  const grest = vorgabe(
    "grestProzent",
    "Grunderwerbsteuer",
    "satz",
    GRUNDERWERBSTEUER[objekt.bundesland] ?? 5,
  );
  const notar = vorgabe("notarProzent", "Notar / Grundbuch", "satz", vorgaben.notarProzent);
  const makler = vorgabe(
    "maklerAnkaufProzent",
    "Maklerprovision",
    "satz",
    objekt.maklerprovision ?? vorgaben.maklerAnkaufProzent,
  );
  const aufwertung = vorgabe("aufwertungManuell", "Kostenschätzung", "betrag", katalog.gesamt);
  const monate = vorgabe("monate", "Dauer inkl. Verkauf", "satz", vorgaben.monate);
  const bewirt = vorgabe(
    "bewirtschaftungMonat",
    "Kosten pro Monat",
    "betrag",
    vorgaben.bewirtschaftungMonat,
  );
  const finanz = vorgabe(
    "finanzierungsbetrag",
    "Finanzierungsbetrag Bank",
    "betrag",
    eingabe.kaufpreis,
  );
  const zins = vorgabe("zinsBankProzent", "Zinssatz p. a.", "satz", vorgaben.zinsBankProzent);
  const gebuehr = vorgabe(
    "gebuehrBankProzent",
    "Bearbeitungsgebühr",
    "satz",
    vorgaben.gebuehrBankProzent,
  );
  const coKapital = vorgabe("coKapital", "Kapital Co-Investor", "betrag", 0);
  const coZins = vorgabe(
    "zinsCoProzent",
    "Zinssatz Co-Investor p. a.",
    "satz",
    vorgaben.zinsCoProzent,
  );
  const maklerVk = vorgabe(
    "maklerVerkaufProzent",
    "Maklerkosten Verkauf",
    "satz",
    vorgaben.maklerVerkaufProzent,
  );
  const staging = vorgabe("homeStaging", "Home Staging", "betrag", vorgaben.homeStaging);
  const abzug = vorgabe("abzugQm", "Abzug Stellplatz / Garage", "betrag", vorgaben.abzugQm);

  // Stellplatz im Steckbrief, aber nichts abgezogen: dann misst der €/m²-Wert
  // auch die Garage mit.
  const stellplatzOhneAbzug = !!objekt.stellplatz?.trim() && eingabe.abzugQm === 0;

  const gut = (v: number | null) =>
    v === null ? "text-grau" : v >= 0 ? "text-[#0C5E3A]" : "text-[#9A2727]";

  return (
    <div className="flex flex-col gap-4 px-4 py-5 md:px-7">
      {/* ----- Kopf ----- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mini-label">Kalkulation · Eigentumswohnung</div>
          <h2 className="headline mt-1 text-[1.35rem]">
            {objekt.bezeichnung?.trim() || objekt.strasse}
          </h2>
        </div>
        <div className="flex items-center gap-3.5 text-[0.72rem] text-grau-stark">
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded border border-[#F0D58A] bg-[#FFF8E1]" />
            Eingabe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded border border-linie-stark bg-flaeche" />
            berechnet
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {/* ----- Eingaben links ----- */}
        <div className="flex min-w-0 flex-[999_1_34rem] flex-col gap-3.5">
          <Karte titel="1. Objektdaten" hinweis="Wirkt auch auf das Objekt selbst.">
            <Zeile label="Wohnfläche" einheit="m²">
              <Eingabe
                label="Wohnfläche"
                art="satz"
                wert={objekt.wohnflaeche}
                setWert={(v) => aendern(objekt.id, { wohnflaeche: v })}
              />
            </Zeile>
            <Zeile label="Baujahr" einheit="">
              <Eingabe
                label="Baujahr"
                art="jahr"
                wert={objekt.baujahr}
                setWert={(v) => aendern(objekt.id, { baujahr: v })}
              />
            </Zeile>
          </Karte>

          <Karte
            titel="2. Ankaufskosten"
            hinweis={`Grunderwerbsteuer kommt automatisch aus dem Bundesland (${BUNDESLAND_NAMEN[objekt.bundesland] ?? objekt.bundesland}), ist aber überschreibbar.`}
          >
            <Zeile label="Kaufpreis" einheit="€">
              <Eingabe
                label="Kaufpreis"
                art="betrag"
                wert={objekt.kaufpreis}
                setWert={(v) => aendern(objekt.id, { kaufpreis: v })}
              />
            </Zeile>
            <Zeile label="Grunderwerbsteuer" einheit="%" ergebnis={f.eur(e.grest)} {...grest}>
              {grest.feld}
            </Zeile>
            <Zeile label="Notar / Grundbuch" einheit="%" ergebnis={f.eur(e.notar)} {...notar}>
              {notar.feld}
            </Zeile>
            <Zeile label="Maklerprovision" einheit="%" ergebnis={f.eur(e.maklerAnkauf)} {...makler}>
              {makler.feld}
            </Zeile>
            <Summenzeile
              label="Nebenkosten gesamt"
              wert={f.eur(e.ankaufsnebenkosten)}
              stark={false}
            />
            <Summenzeile
              label="Ankaufskosten"
              wert={f.eur(eingabe.kaufpreis + e.ankaufsnebenkosten)}
            />
          </Karte>

          <Karte
            titel="3. Aufwertung"
            hinweis={`Leer lassen = Summe aus dem Katalog unten (${f.eur(katalog.gesamt)}).`}
          >
            <Zeile
              label="Kostenschätzung"
              einheit="€"
              ergebnis={f.eur(e.aufwertung)}
              {...aufwertung}
            >
              {aufwertung.feld}
            </Zeile>
            <Zeile label="Dauer inkl. Verkauf" einheit="Mon." {...monate}>
              {monate.feld}
            </Zeile>
          </Karte>

          <Karte titel="4. Bewirtschaftung">
            <Zeile
              label="Kosten pro Monat"
              einheit="€"
              ergebnis={f.eur(e.bewirtschaftung)}
              {...bewirt}
            >
              {bewirt.feld}
            </Zeile>
          </Karte>

          <Karte titel="5. Finanzierung">
            <Zeile label="Finanzierungsbetrag Bank" einheit="€" {...finanz}>
              {finanz.feld}
            </Zeile>
            <Zeile label="Zinssatz p. a." einheit="%" ergebnis={f.eur(e.zinsenBank)} {...zins}>
              {zins.feld}
            </Zeile>
            <Zeile
              label="Bearbeitungsgebühr"
              einheit="%"
              ergebnis={f.eur(e.gebuehrBank)}
              {...gebuehr}
            >
              {gebuehr.feld}
            </Zeile>
            <Zeile label="Kapital Co-Investor" einheit="€" {...coKapital}>
              {coKapital.feld}
            </Zeile>
            <Zeile
              label="Zinssatz Co-Investor p. a."
              einheit="%"
              ergebnis={f.eur(e.kostenCo)}
              {...coZins}
            >
              {coZins.feld}
            </Zeile>
            <Summenzeile label="Finanzierungskosten gesamt" wert={f.eur(e.finanzierungskosten)} />
          </Karte>

          <Karte
            titel="6. Vermarktung"
            hinweis="Makler Verkauf rechnet je Szenario auf den jeweiligen Verkaufspreis."
          >
            <Zeile label="Maklerkosten Verkauf" einheit="%" {...maklerVk}>
              {maklerVk.feld}
            </Zeile>
            <Zeile label="Home Staging" einheit="€" {...staging}>
              {staging.feld}
            </Zeile>
          </Karte>

          <Karte titel="7. Verkaufserwartung">
            <div className="grid min-h-7 grid-cols-[31%_23%_23%_23%] items-center bg-flaeche-hoch text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-grau">
              <div />
              {SZENARIEN.map((s) => (
                <div key={s} className="px-2.5 text-right">
                  {SZENARIO_TITEL[s]}
                </div>
              ))}
            </div>
            <div className="grid min-h-[30px] grid-cols-[31%_23%_23%_23%] items-center border-b border-linie text-[0.8rem]">
              <div className="truncate px-2.5 text-grau-stark">Erzielbarer Verkaufspreis €</div>
              {SZENARIEN.map((s) => (
                <div key={s} className="px-2.5">
                  <Eingabe
                    label={`Verkaufspreis ${SZENARIO_TITEL[s]}`}
                    art="betrag"
                    wert={kalk.verkauf?.[s] ?? null}
                    setWert={(v) => setze({ verkauf: { ...kalk.verkauf, [s]: v } })}
                  />
                </div>
              ))}
            </div>
            <div className="grid min-h-[30px] grid-cols-[31%_23%_23%_23%] items-center border-b border-linie text-[0.8rem]">
              <div
                title="Anteil Stellplatz, Garage oder TG am Verkaufspreis, damit der €/m²-Wert nur die Wohnfläche misst"
                className="truncate px-2.5 text-grau-stark"
              >
                Abzug Stellplatz / Garage €
              </div>
              <div className="flex items-center gap-1 px-2.5">
                {abzug.feld}
                {abzug.ueberschrieben && (
                  <button
                    type="button"
                    onClick={abzug.zuruecksetzen}
                    title="Vorgabe wiederherstellen"
                    className="druckbar text-grau hover:text-tinte"
                  >
                    <RotateCcw size={10} strokeWidth={2} />
                  </button>
                )}
              </div>
              <div className="col-span-2 px-2.5 text-[0.64rem] text-[#8A5608]">
                {stellplatzOhneAbzug && `Steckbrief: „${objekt.stellplatz}“ — Abzug prüfen`}
              </div>
            </div>
            <div className="grid min-h-[30px] grid-cols-[31%_23%_23%_23%] items-center text-[0.8rem]">
              <div className="truncate px-2.5 text-grau-stark">€/m² Wohnfläche</div>
              {SZENARIEN.map((s) => (
                <div key={s} className="zahl px-2.5 text-right text-tinte">
                  {f.eur(e.szenarien[s].preisJeQm)}
                </div>
              ))}
            </div>
          </Karte>

          <Karte titel="8. Marktwert-Einschätzung (Eigennutzer)">
            {MARKTQUELLEN.map((q) => {
              const w = kalk.marktwerte?.[q.id] ?? null;
              return (
                <Zeile
                  key={q.id}
                  label={q.titel}
                  einheit="€"
                  ergebnis={
                    w && eingabe.wohnflaeche ? `${GANZ.format(w / eingabe.wohnflaeche)} €/m²` : "–"
                  }
                >
                  <Eingabe
                    label={q.titel}
                    art="betrag"
                    wert={w}
                    setWert={(v) => setze({ marktwerte: { ...kalk.marktwerte, [q.id]: v } })}
                  />
                </Zeile>
              );
            })}
          </Karte>
        </div>

        {/* ----- Ergebnis rechts, bleibt beim Scrollen stehen ----- */}
        {/* Steht unter dem festen Kopf des Fensters — dessen Höhe misst ObjektDetail. */}
        <div className="flex min-w-0 flex-[1_1_25rem] flex-col gap-3.5 md:sticky md:top-[calc(var(--kopf-hoehe,0px)+12px)]">
          <Karte titel="Ergebnis · Top-Down intern">
            <div className="grid min-h-7 grid-cols-[31%_23%_23%_23%] items-center bg-flaeche-hoch text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-grau">
              <div />
              {SZENARIEN.map((s) => (
                <div key={s} className="px-2.5 text-right">
                  {SZENARIO_TITEL[s]}
                </div>
              ))}
            </div>
            {(
              [
                ["Kaufpreis", () => eingabe.kaufpreis],
                ["Ankaufsnebenkosten", () => e.ankaufsnebenkosten],
                ["Aufwertung", () => e.aufwertung],
                ["Bewirtschaftung", () => e.bewirtschaftung],
                ["Vermarktung", (s) => e.szenarien[s].vermarktung],
                ["Finanzierung", () => e.finanzierungskosten],
                ["Gesamtinvestition", (s) => e.szenarien[s].gesamtinvestition, "summe"],
                ["Verkaufspreis", (s) => e.szenarien[s].verkaufspreis],
                ["Gewinn vor Steuer", (s) => e.szenarien[s].gewinn, "gewinn"],
              ] as [
                string,
                (s: (typeof SZENARIEN)[number]) => number | null,
                ("summe" | "gewinn")?,
              ][]
            ).map(([label, wert, art]) => (
              <div
                key={label}
                className={cn(
                  "grid min-h-[30px] grid-cols-[31%_23%_23%_23%] items-center border-b border-linie text-[0.8rem]",
                  art && "border-t border-t-linie-stark font-bold",
                )}
              >
                <div className={cn("truncate px-2.5", art ? "text-tinte" : "text-grau-stark")}>
                  {label}
                </div>
                {SZENARIEN.map((s) => (
                  <div
                    key={s}
                    className={cn(
                      "zahl truncate px-2.5 text-right",
                      art === "gewinn" ? gut(wert(s)) : "text-tinte",
                    )}
                  >
                    {f.eur(wert(s))}
                  </div>
                ))}
              </div>
            ))}
            <div className="grid min-h-[30px] grid-cols-[31%_23%_23%_23%] items-center text-[0.8rem]">
              <div className="truncate px-2.5 text-grau-stark">Gewinn in %</div>
              {SZENARIEN.map((s) => (
                <div key={s} className={cn("zahl px-2.5 text-right", gut(e.szenarien[s].gewinn))}>
                  {f.prozent(e.szenarien[s].gewinnProzent)}
                </div>
              ))}
            </div>
          </Karte>

          <div className="grid grid-cols-3 gap-2.5">
            {SZENARIEN.map((s) => (
              <div
                key={s}
                className="flex flex-col gap-1 rounded-[14px] border border-linie bg-flaeche p-3"
              >
                <div className="mini-label">{SZENARIO_TITEL[s]}</div>
                <div className={cn("headline zahl text-[1.25rem]", gut(e.szenarien[s].gewinn))}>
                  {f.prozent(e.szenarien[s].gewinnProzent)}
                </div>
                <div className="zahl text-[0.72rem] text-grau-stark">
                  {f.eur(e.szenarien[s].gewinn)} Gewinn
                </div>
              </div>
            ))}
          </div>

          <Karte titel="Ansicht Bank · Mid-Case">
            {(
              [
                ["Kaufpreis", eingabe.kaufpreis],
                ["Ankaufsnebenkosten", e.ankaufsnebenkosten],
                ["Aufwertung", e.aufwertung],
                ["Bewirtschaftung", e.bewirtschaftung],
                ["Vermarktung", e.szenarien.mid.vermarktung],
                ["Finanzierung", e.finanzierungskosten],
                ["Gesamtinvestition", e.szenarien.mid.gesamtinvestition, true],
                ["Verkaufspreis", e.szenarien.mid.verkaufspreis],
              ] as [string, number | null, boolean?][]
            ).map(([label, wert, summe]) => (
              <div
                key={label}
                className={cn(
                  "grid min-h-[30px] grid-cols-[60%_40%] items-center border-b border-linie text-[0.8rem]",
                  summe && "border-t border-t-linie-stark font-bold",
                )}
              >
                <div className={cn("px-2.5", summe ? "text-tinte" : "text-grau-stark")}>
                  {label}
                </div>
                <div className="zahl px-2.5 text-right text-tinte">{f.eur(wert)}</div>
              </div>
            ))}
            <div className="grid min-h-[30px] grid-cols-[60%_40%] items-center border-t border-t-linie-stark text-[0.8rem] font-bold">
              <div className="px-2.5 text-tinte">Gewinn vor Steuer</div>
              <div className="zahl px-2.5 text-right text-tinte">
                {f.eur(e.szenarien.mid.gewinn)} · {f.prozent(e.szenarien.mid.gewinnProzent)}
              </div>
            </div>
          </Karte>
        </div>
      </div>

      {/* ----- Aufwertungskatalog ----- */}
      <Katalog
        kalk={kalk}
        vorgaben={vorgaben}
        wohnflaeche={eingabe.wohnflaeche}
        summen={katalog}
        alleZeigen={alleZeigen}
        setAlleZeigen={setAlleZeigen}
        setze={setze}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Katalog                                                              */
/* ------------------------------------------------------------------ */

function Katalog({
  kalk,
  vorgaben,
  wohnflaeche,
  summen,
  alleZeigen,
  setAlleZeigen,
  setze,
}: {
  kalk: EtwKalkulation;
  vorgaben: EtwVorgaben;
  wohnflaeche: number;
  summen: ReturnType<typeof katalogSumme>;
  alleZeigen: boolean;
  setAlleZeigen: (v: boolean) => void;
  setze: (teil: Partial<EtwKalkulation>) => void;
}) {
  // Nur Gewerke mit Werten stehen offen — sonst sind es 102 Zeilen.
  const [offen, setOffen] = useState<Set<string>>(
    () =>
      new Set(AUFWERTUNGSKATALOG.filter((g) => (summen.jeGewerk[g.id] ?? 0) > 0).map((g) => g.id)),
  );

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

  const raster =
    "grid min-h-[30px] grid-cols-[46%_16%_8%_14%_16%] items-center border-b border-linie text-[0.8rem]";

  return (
    <section className="overflow-hidden rounded-[18px] border border-linie bg-flaeche">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-2.5 pt-3 pb-1">
        <div className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-grau">
          Aufwertungskatalog · {f.eur(summen.gesamt)}
        </div>
        <button
          type="button"
          onClick={() => setAlleZeigen(!alleZeigen)}
          aria-pressed={alleZeigen}
          className={cn(
            "druckbar h-6 rounded-full border px-3 text-[0.72rem] font-semibold",
            alleZeigen
              ? "border-tinte bg-tinte text-grund"
              : "border-linie-stark bg-flaeche text-grau-stark",
          )}
        >
          {alleZeigen ? "Nur genutzte Gewerke" : "Alle Positionen zeigen"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[47.5rem]">
          <div
            className={cn(
              raster,
              "min-h-7 bg-flaeche-hoch text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-grau",
            )}
          >
            <div className="px-2.5">Position</div>
            <div className="px-2.5 text-right">Menge / Auswahl</div>
            <div className="px-2.5">Einheit</div>
            <div className="px-2.5 text-right">€ je Einheit</div>
            <div className="px-2.5 text-right">Summe</div>
          </div>
          {AUFWERTUNGSKATALOG.map((g) => {
            const summe = summen.jeGewerk[g.id] ?? 0;
            const aktiv = g.positionen.filter((p) => (kalk.katalog?.[p.id] ?? 0) > 0).length;
            const istOffen = alleZeigen || offen.has(g.id);
            return (
              <div key={g.id}>
                <button
                  type="button"
                  onClick={() =>
                    setOffen((alt) => {
                      const neu = new Set(alt);
                      if (neu.has(g.id)) neu.delete(g.id);
                      else neu.add(g.id);
                      return neu;
                    })
                  }
                  aria-expanded={istOffen}
                  className="druckbar grid min-h-[30px] w-full grid-cols-[84%_16%] items-center border-b border-linie bg-[#FAFBFC] text-left text-[0.8rem] hover:bg-flaeche-hoch"
                >
                  <span className="flex items-center gap-2 px-2.5 font-semibold text-tinte">
                    <span className="w-3 text-grau">{istOffen ? "▾" : "▸"}</span>
                    {g.titel}
                    {aktiv > 0 && (
                      <span className="text-[0.72rem] font-normal text-grau">
                        {aktiv} von {g.positionen.length}
                      </span>
                    )}
                  </span>
                  <span className="zahl px-2.5 text-right font-bold text-tinte">
                    {summe > 0 ? f.eur(summe) : "–"}
                  </span>
                </button>
                {istOffen &&
                  g.positionen.map((p) => {
                    const m = kalk.katalog?.[p.id] ?? 0;
                    const pr = katalogPreis(p.id, vorgaben, kalk);
                    const betrag = positionsBetrag(p, m, pr, wohnflaeche);
                    return (
                      <div key={p.id} className={raster}>
                        <div
                          title={p.titel}
                          className={cn(
                            "truncate pr-2.5 pl-[30px]",
                            betrag > 0 ? "text-tinte" : "text-grau",
                          )}
                        >
                          {p.titel}
                        </div>
                        <div className="flex justify-end px-2.5">
                          {p.art === "menge" ? (
                            <Eingabe
                              label={`Menge ${p.titel}`}
                              art="satz"
                              wert={m || null}
                              setWert={(v) => menge(p.id, v ?? 0)}
                              breite="w-full max-w-[5.6rem]"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => menge(p.id, m ? 0 : 1)}
                              aria-pressed={m > 0}
                              className={cn(
                                "druckbar h-6 min-w-[3.6rem] rounded-full border text-[0.74rem] font-semibold",
                                m > 0
                                  ? "border-tinte bg-tinte text-grund"
                                  : "border-linie-stark bg-flaeche text-grau",
                              )}
                            >
                              {m > 0 ? "Ja" : "Nein"}
                            </button>
                          )}
                        </div>
                        <div className="truncate px-2.5 text-[0.68rem] text-grau">
                          {p.art === "flaeche"
                            ? `× ${GANZ.format(wohnflaeche)} m²`
                            : (p.einheit ?? "")}
                        </div>
                        <div className="flex justify-end px-2.5">
                          <Eingabe
                            label={`Preis ${p.titel}`}
                            art="betrag"
                            wert={kalk.preise?.[p.id] ?? null}
                            vorgabe={vorgaben.preise[p.id] ?? KATALOG_PREISE[p.id]}
                            setWert={(v) => preis(p.id, v)}
                            breite="w-full max-w-[6rem]"
                          />
                        </div>
                        <div className="zahl px-2.5 text-right text-tinte">
                          {betrag > 0 ? f.eur(betrag) : "–"}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
          <div className="grid min-h-[30px] grid-cols-[84%_16%] items-center border-t border-linie-stark text-[0.8rem] font-bold">
            <div className="px-2.5 text-tinte">Gesamtkosten brutto</div>
            <div className="zahl px-2.5 text-right text-tinte">{f.eur(summen.gesamt)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Einstellungen                                                        */
/* ------------------------------------------------------------------ */

/**
 * Die Standardwerte für alle Objekte. Leeres Feld heißt: Wert aus
 * `docs/planung/KALKULATION_ETW.md`. Preise je Position sind eingeklappt —
 * man ändert selten mehr als zwei auf einmal.
 */
export function KalkulationsVorgaben() {
  const { vorgaben, vorgabenSetzen, preisSetzen, vorgabenZuruecksetzen } = useEinstellungen();
  const [preiseOffen, setPreiseOffen] = useState(false);
  // Schlüssel beim Zurücksetzen wechseln, damit die Felder ihren Text verlieren.
  const [runde, setRunde] = useState(0);

  const felder: [keyof Omit<EtwVorgaben, "preise">, string, string, "betrag" | "satz", number][] = [
    ["notarProzent", "Notar/Grundbuch", "%", "satz", 2],
    ["maklerAnkaufProzent", "Maklerprovision Ankauf", "%", "satz", 0],
    ["monate", "Dauer der Maßnahme", "Mon.", "satz", 4],
    ["bewirtschaftungMonat", "Bewirtschaftung pro Monat", "€", "betrag", 100],
    ["zinsBankProzent", "Zinssatz Bank", "%", "satz", 5.5],
    ["gebuehrBankProzent", "Bearbeitungsgebühr", "%", "satz", 1.5],
    ["zinsCoProzent", "Zinssatz Co-Investor", "%", "satz", 8],
    ["maklerVerkaufProzent", "Makler Verkauf", "%", "satz", 0],
    ["homeStaging", "Home Staging", "€", "betrag", 0],
    ["abzugQm", "Abzug Stellplatz / Garage", "€", "betrag", 0],
  ];

  return (
    <div key={runde}>
      <div className="mt-5 max-w-xl overflow-hidden rounded-[18px] border border-linie bg-flaeche">
        {felder.map(([schluessel, titel, einheit, art, standard]) => (
          <Zeile
            key={schluessel}
            label={titel}
            einheit={einheit}
            ueberschrieben={vorgaben[schluessel] !== standard}
            zuruecksetzen={() => vorgabenSetzen({ [schluessel]: standard })}
          >
            <Eingabe
              label={titel}
              art={art}
              wert={vorgaben[schluessel] === standard ? null : vorgaben[schluessel]}
              vorgabe={standard}
              setWert={(v) => vorgabenSetzen({ [schluessel]: v ?? standard })}
            />
          </Zeile>
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
          {preiseOffen ? "▾" : "▸"} Katalogpreise
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
        <div className="mt-4 flex max-w-xl flex-col gap-4">
          {AUFWERTUNGSKATALOG.map((g) => (
            <div
              key={g.id}
              className="overflow-hidden rounded-[18px] border border-linie bg-flaeche"
            >
              <div className="px-2.5 pt-3 pb-1.5 text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-grau">
                {g.titel}
              </div>
              {g.positionen.map((p) => (
                <Zeile
                  key={p.id}
                  label={p.titel}
                  einheit={
                    p.art === "flaeche" ? "€/m²" : p.art === "menge" ? `€/${p.einheit}` : "€"
                  }
                >
                  <Eingabe
                    label={p.titel}
                    art="betrag"
                    wert={vorgaben.preise[p.id] ?? null}
                    vorgabe={p.preis}
                    setWert={(v) => preisSetzen(p.id, v)}
                  />
                </Zeile>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
