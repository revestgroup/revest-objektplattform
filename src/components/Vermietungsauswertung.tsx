/**
 * Auswertung der Vermietung.
 *
 * Die Mietverwaltung zeigt Einheiten und Mieter — beides Gegenwart. Dieser
 * Reiter zeigt die Verpflichtung: wie viele Mietverhältnisse laufen, was die
 * Garantien jeden Monat kosten und wann welche ausläuft.
 *
 * Der Auslaufplan ist der Grund für die Seite. Eine Garantie, die in zwei
 * Monaten endet, braucht eine Anschlussvereinbarung — und die Nachricht darf
 * nicht vom Käufer kommen.
 */
import { useMemo } from "react";

import {
  BELASTUNGSFARBEN,
  MIETERQUELLEN,
  MIETERSTATUS,
  unterlagenstand,
  belastungsurteil,
  mietbelastung,
  zahltMiete,
  type Mieter,
  type Mieterquelle,
} from "../lib/mieter";
import { f } from "../lib/objekte";
import {
  GARANTIEARTEN,
  GARANTIESTATUS,
  berechneGarantie,
  type Mietgarantie,
} from "../lib/vermietung";
import { useVermietung } from "../lib/vermietungStore";
import { cn } from "../lib/utils";

const monat = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { month: "short", year: "numeric" });

export function Vermietungsauswertung() {
  const { garantien, mieter, bereit } = useVermietung();

  const d = useMemo(() => auswerten(garantien, mieter), [garantien, mieter]);

  if (!bereit) return <div className="h-48" />;

  return (
    <div className="divide-y divide-linie">
      {/* ----- Kennzahlen ----- */}
      <section className="grid grid-cols-2 gap-3 px-4 py-5 sm:px-6 md:px-10 lg:grid-cols-4">
        {[
          { titel: "Laufende Mietverhältnisse", wert: String(d.laufendeMieten) },
          { titel: "Laufende Garantien", wert: String(d.laufende.length) },
          {
            titel: "Deckung / Monat",
            wert: `${d.deckung < 0 ? "−" : "+"}${f.eur(Math.abs(d.deckung))}`,
            warnung: d.deckung < 0,
          },
          { titel: "Restverpflichtung", wert: f.eurKurz(d.restverpflichtung) },
        ].map((k, i) => (
          <div
            key={k.titel}
            className={cn(
              "eintritt min-w-0 rounded-2xl border bg-flaeche px-3.5 py-4 sm:px-5",
              k.warnung ? "border-[#E3BDB9]" : "border-linie",
            )}
            style={{ animationDelay: `${i * 28}ms` }}
          >
            <div className="mini-label">{k.titel}</div>
            <div
              className={cn(
                "zahl mt-2 text-[1.2rem] leading-none font-semibold break-words sm:text-[1.5rem]",
                k.warnung ? "text-[#8A2822]" : "text-tinte",
              )}
            >
              {k.wert}
            </div>
          </div>
        ))}
      </section>

      {/* ----- Auslaufplan ----- */}
      <Abschnitt titel="Auslaufplan">
        {d.nachEnde.length === 0 ? (
          <Leer text="Keine laufende Garantie." />
        ) : (
          <ul className="space-y-2">
            {d.nachEnde.map(({ g, k }) => {
              const st = GARANTIESTATUS[k.status];
              // Anteil der verstrichenen Laufzeit — ohne Achse, nur als Linie.
              const anteil = Math.max(
                0,
                Math.min(100, ((g.laufzeitMonate - k.restMonate) / g.laufzeitMonate) * 100),
              );
              return (
                <li
                  key={g.id}
                  className="rounded-xl border border-linie bg-flaeche px-3.5 py-3 sm:px-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.84rem] font-medium text-tinte">
                        {g.adresse}
                      </div>
                      <div className="mt-0.5 truncate text-[0.7rem] text-grau">
                        {g.einheitTitel} · {GARANTIEARTEN[g.art].kurz} · {f.eur(g.garantiemiete)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className="zahl text-[0.84rem] font-semibold"
                        style={{ color: st.tief }}
                      >
                        {monat(k.ende.toISOString())}
                      </div>
                      <div className="mt-0.5 text-[0.66rem] text-grau">
                        {k.restMonate === 0 ? "läuft ab" : `${k.restMonate} Mon.`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-[3px] w-full rounded-full bg-[#E6E9EE]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${anteil}%`, background: st.farbe }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {d.beendet.length > 0 && (
          <p className="mt-4 text-[0.7rem] text-grau">
            {d.beendet.length} {d.beendet.length === 1 ? "Garantie" : "Garantien"} bereits
            ausgelaufen.
          </p>
        )}
      </Abschnitt>

      {/* ----- Belegung ----- */}
      <Abschnitt titel="Belegung">
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          {[
            { titel: "Plätze gesamt", wert: String(d.plaetze) },
            { titel: "Belegt", wert: String(d.belegt) },
            { titel: "Frei", wert: String(d.plaetze - d.belegt) },
            { titel: "Quote", wert: d.plaetze === 0 ? "—" : f.prozent(d.quote) },
          ].map((k) => (
            <div key={k.titel} className="min-w-0">
              <div className="mini-label">{k.titel}</div>
              <div className="zahl mt-1.5 text-[1.3rem] leading-none font-semibold text-tinte">
                {k.wert}
              </div>
            </div>
          ))}
        </div>

        {d.freieListe.length > 0 && (
          <ul className="mt-6 space-y-2">
            {d.freieListe.map(({ g, k }) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#E3BDB9] bg-[#FDF4F3] px-3.5 py-3 sm:px-4"
              >
                <span className="min-w-0 flex-1 truncate text-[0.82rem] font-medium text-tinte">
                  {g.adresse}
                </span>
                <span className="shrink-0 text-[0.7rem] text-grau">{g.einheitTitel}</span>
                <span className="zahl shrink-0 text-[0.74rem] font-semibold text-[#8A2822]">
                  {k.plaetze - k.belegt} frei
                </span>
              </li>
            ))}
          </ul>
        )}
      </Abschnitt>

      {/* ----- Mieter ----- */}
      <Abschnitt titel="Mieterstruktur">
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          {[
            { titel: "Ø Kaltmiete", wert: d.schnittMiete === null ? "—" : f.eur(d.schnittMiete) },
            {
              titel: "Ø Mietbelastung",
              wert: d.schnittQuote === null ? "—" : f.prozent(d.schnittQuote),
              farbe:
                d.schnittQuote === null
                  ? undefined
                  : BELASTUNGSFARBEN[belastungsurteil(d.schnittQuote)],
            },
            { titel: "Mit Bürgen", wert: String(d.mitBuergen) },
            { titel: "Einzug in 90 Tagen", wert: String(d.einzuege) },
          ].map((k) => (
            <div key={k.titel} className="min-w-0">
              <div className="mini-label">{k.titel}</div>
              <div
                className="zahl mt-1.5 text-[1.3rem] leading-none font-semibold text-tinte"
                style={{ color: k.farbe }}
              >
                {k.wert}
              </div>
            </div>
          ))}
        </div>

        {/* Woher die Mieter kommen — entscheidet, wo man den nächsten sucht. */}
        <ul className="mt-6 space-y-2">
          {d.quellen.map(([q, anzahl]) => (
            <li key={q} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-[0.72rem] text-grau sm:w-32">
                {MIETERQUELLEN[q]}
              </span>
              <span className="h-1.5 min-w-0 flex-1 rounded-full bg-[#E6E9EE]">
                <span
                  className="block h-full rounded-full bg-tinte"
                  style={{ width: `${(anzahl / d.maxQuelle) * 100}%` }}
                />
              </span>
              <span className="zahl w-6 shrink-0 text-right text-[0.74rem] font-semibold text-tinte">
                {anzahl}
              </span>
            </li>
          ))}
        </ul>
      </Abschnitt>

      {/* ----- Warteliste ----- */}
      <Abschnitt titel="Mieterpipeline">
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          {[
            { titel: "Ohne Platz", wert: d.ohnePlatz },
            { titel: "Zuordnungsreif", wert: d.zuordnungsreif },
            { titel: "Unterlagen offen", wert: d.unterlagenOffen, warnung: true },
            { titel: "Vertrag unterwegs", wert: d.vertragUnterwegs },
            { titel: "Eingezogen", wert: d.eingezogen },
          ].map((k) => (
            <div key={k.titel} className="min-w-0">
              <div className="mini-label">{k.titel}</div>
              <div
                className={cn(
                  "zahl mt-1.5 text-[1.3rem] leading-none font-semibold",
                  k.warnung && k.wert > 0 ? "text-[#8A2822]" : "text-tinte",
                )}
              >
                {k.wert}
              </div>
            </div>
          ))}
        </div>
      </Abschnitt>

      {/* ----- Geld ----- */}
      <Abschnitt titel="Monatlich">
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          {[
            { titel: "Garantiert", wert: f.eur(d.garantiert) },
            { titel: "Ist-Miete", wert: f.eur(d.ist) },
            {
              titel: "Deckung",
              wert: `${d.deckung < 0 ? "−" : "+"}${f.eur(Math.abs(d.deckung))}`,
              farbe: d.deckung < 0 ? "#8A2822" : "#0C5E3A",
            },
            {
              titel: "Jahr",
              wert: `${d.deckung < 0 ? "−" : "+"}${f.eurKurz(Math.abs(d.deckung) * 12)}`,
              farbe: d.deckung < 0 ? "#8A2822" : "#0C5E3A",
            },
          ].map((k) => (
            <div key={k.titel} className="min-w-0">
              <div className="mini-label">{k.titel}</div>
              <div
                className="zahl mt-1.5 text-[1.3rem] leading-none font-semibold break-words text-tinte"
                style={{ color: k.farbe }}
              >
                {k.wert}
              </div>
            </div>
          ))}
        </div>
      </Abschnitt>
    </div>
  );
}

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-7 sm:px-6 md:px-10 md:py-9">
      <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
        {titel}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Leer({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-linie-stark px-4 py-8 text-center text-[0.76rem] text-grau">
      {text}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Rechnen                                                              */
/* ------------------------------------------------------------------ */

function auswerten(garantien: Mietgarantie[], mieter: Mieter[]) {
  const mitZahlen = garantien.map((g) => ({ g, k: berechneGarantie(g, mieter) }));
  const laufende = mitZahlen.filter(({ k }) => k.status !== "beendet");
  const beendet = mitZahlen.filter(({ k }) => k.status === "beendet");

  const garantiert = laufende.reduce((s, { g }) => s + g.garantiemiete, 0);
  const ist = laufende.reduce((s, { k }) => s + k.istMiete, 0);
  const plaetze = laufende.reduce((s, { k }) => s + k.plaetze, 0);
  const belegt = laufende.reduce((s, { k }) => s + k.belegt, 0);

  const zahlende = mieter.filter(zahltMiete);
  const quoten = zahlende.map(mietbelastung).filter((q): q is number => q !== null);

  const heute = Date.now();
  const inNeunzig = heute + 90 * 24 * 60 * 60 * 1000;

  const quellenZaehler = new Map<Mieterquelle, number>();
  for (const m of mieter) {
    quellenZaehler.set(m.quelle, (quellenZaehler.get(m.quelle) ?? 0) + 1);
  }
  const quellen = [...quellenZaehler.entries()].sort((a, b) => b[1] - a[1]);

  // Wer noch auf einen Platz wartet, und woran es hängt.
  const ohnePlatz = mieter.filter((m) => MIETERSTATUS[m.status].offen);
  const unterlagenOffen = ohnePlatz.filter((m) => !unterlagenstand(m).vollstaendig).length;

  return {
    laufende,
    beendet,
    laufendeMieten: zahlende.length,
    garantiert,
    ist,
    deckung: ist - garantiert,
    restverpflichtung: laufende.reduce((s, { k }) => s + k.restverpflichtung, 0),
    // Nach Ende sortiert: was zuerst ausläuft, steht oben.
    nachEnde: [...laufende].sort((a, b) => a.k.ende.getTime() - b.k.ende.getTime()),
    plaetze,
    belegt,
    quote: plaetze === 0 ? 0 : (belegt / plaetze) * 100,
    freieListe: laufende.filter(({ k }) => k.belegt < k.plaetze),
    schnittMiete:
      zahlende.length === 0
        ? null
        : zahlende.reduce((s, m) => s + (m.miete ?? 0), 0) / zahlende.length,
    schnittQuote: quoten.length === 0 ? null : quoten.reduce((s, q) => s + q, 0) / quoten.length,
    mitBuergen: mieter.filter((m) => m.buerge !== null).length,
    einzuege: mieter.filter((m) => {
      if (!m.einzugAm) return false;
      const t = new Date(m.einzugAm).getTime();
      return t >= heute && t <= inNeunzig;
    }).length,
    ohnePlatz: ohnePlatz.length,
    zuordnungsreif: ohnePlatz.length - unterlagenOffen,
    unterlagenOffen,
    vertragUnterwegs: mieter.filter((m) => m.vertrag?.status === "versendet").length,
    eingezogen: mieter.filter((m) => m.status === "eingezogen").length,
    quellen,
    maxQuelle: Math.max(1, ...quellen.map(([, n]) => n)),
  };
}
