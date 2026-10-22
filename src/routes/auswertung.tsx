/**
 * Auswertung.
 *
 * Kein Diagrammbaukasten, sondern vier Fragen, die Timo wirklich stellt:
 * Was ist im Bestand? Wie läuft die Pipeline? Wo liegt das Geld? Und warum
 * sind Deals geplatzt?
 *
 * Alle Balken sind reines CSS — eine Diagrammbibliothek für sieben Balken
 * wäre mehr Abhängigkeit als Nutzen.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { Seitenkopf } from "../components/AppLayout";
import {
  EINHEITSSTATUS,
  OBJEKTARTEN,
  STUFEN,
  STUFEN_REIHENFOLGE,
  berechneKennzahlen,
  f,
  type Einheitsstatus,
  type Objekt,
  type Objektart,
} from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { bilanzJeStadtteil } from "../lib/stadtteile";

export const Route = createFileRoute("/auswertung")({ component: AuswertungSeite });

function AuswertungSeite() {
  const { objekte, bereit } = useObjekte();

  const d = useMemo(() => auswerten(objekte), [objekte]);

  return (
    <>
      <Seitenkopf label="Zahlen zum Bestand" titel="Auswertung" />

      {!bereit ? (
        <div className="h-64" />
      ) : (
        <div className="divide-y divide-linie">
          {/* ----- Bestand ----- */}
          {/* Stand früher am Fuß der Seitenleiste. Dort war es eine Zahl, die
              auf jeder Seite mitlief, ohne dass man sie je gebraucht hätte —
              hier steht sie da, wo man Zahlen sucht. */}
          <section className="flex flex-wrap gap-x-12 gap-y-5 px-6 py-6 md:px-10">
            {[
              { titel: "In Prüfung", wert: d.aktiv },
              { titel: "Angekauft", wert: d.angekauft.length },
              { titel: "Einheiten", wert: d.einheitenGesamt },
            ].map((k, i) => (
              <div key={k.titel} className="eintritt" style={{ animationDelay: `${i * 28}ms` }}>
                <div className="mini-label">{k.titel}</div>
                <div className="zahl mt-1.5 text-[1.4rem] leading-none font-semibold text-tinte">
                  {k.wert}
                </div>
              </div>
            ))}
          </section>

          {/* ----- Kopfzahlen ----- */}
          <section className="grid grid-cols-2 gap-3 px-6 py-6 md:px-10 lg:grid-cols-4">
            {[
              {
                titel: "Gesamtinvestition",
                // Gekürzt, weil die Kachel auf dem Telefon halb so breit ist
                // wie vorher die Tabellenzelle.
                wert: f.eurKurz(d.investiert),
              },
              {
                titel: "Jahresmiete",
                wert: f.eurKurz(d.jahresmiete),
                // Die einzige Unterzeile, die etwas trägt: was noch zu holen ist.
                unten: d.mietPotenzial > 0 ? `+ ${f.eur(d.mietPotenzial)} Potenzial` : undefined,
              },
              { titel: "Ø Faktor", wert: f.faktor(d.faktorMittel) },
              { titel: "Ø Bruttorendite", wert: f.prozent(d.renditeMittel) },
            ].map((k, i) => (
              <div
                key={k.titel}
                className="eintritt rounded-2xl border border-linie bg-flaeche px-4 py-4 md:px-5 md:py-5"
                style={{ animationDelay: `${i * 28}ms` }}
              >
                <div className="mini-label">{k.titel}</div>
                <div className="zahl mt-2.5 truncate text-[1.4rem] leading-none font-semibold text-tinte md:text-[1.75rem]">
                  {k.wert}
                </div>
                <div className="mt-2 truncate text-[0.66rem] text-grau">{k.unten}</div>
              </div>
            ))}
          </section>

          {/* ----- Pipeline ----- */}
          <Abschnitt nummer="01" titel="Pipeline">
            <div className="flex flex-col gap-3">
              {STUFEN_REIHENFOLGE.map((s) => {
                const gruppe = objekte.filter((o) => o.stufe === s);
                const summe = gruppe.reduce((x, o) => x + (o.kaufpreis ?? 0), 0);
                return (
                  <Balken
                    key={s}
                    titel={STUFEN[s].titel}
                    anzahl={gruppe.length}
                    anteil={d.maxStufe > 0 ? gruppe.length / d.maxStufe : 0}
                    farbe={STUFEN[s].farbe}
                    rechts={summe > 0 ? f.eur(summe) : "—"}
                  />
                );
              })}
            </div>
          </Abschnitt>

          {/* ----- Stadtteile ----- */}
          <Abschnitt nummer="02" titel="Verteilung nach Stadtteil">
            <div className="flex flex-col gap-3">
              {d.stadtteile.map((b) => (
                <Balken
                  key={b.schluessel}
                  titel={b.name}
                  unten={b.stadt}
                  anzahl={b.anzahl}
                  anteil={d.maxStadtteil > 0 ? b.anzahl / d.maxStadtteil : 0}
                  rechts={b.investiert > 0 ? f.eur(b.investiert) : `${b.aktiv} in Prüfung`}
                />
              ))}
            </div>
          </Abschnitt>

          {/* ----- Objektarten und Einheiten ----- */}
          <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-linie">
            <Abschnitt nummer="03" titel="Objektarten">
              <div className="flex flex-col gap-3">
                {(Object.keys(OBJEKTARTEN) as Objektart[]).map((a) => {
                  const anzahl = objekte.filter((o) => o.objektart === a).length;
                  return (
                    <Balken
                      key={a}
                      titel={OBJEKTARTEN[a]}
                      anzahl={anzahl}
                      anteil={d.maxArt > 0 ? anzahl / d.maxArt : 0}
                    />
                  );
                })}
              </div>
            </Abschnitt>

            <Abschnitt nummer="04" titel="Einheiten im Bestand">
              {d.einheitenGesamt === 0 ? (
                <p className="text-[0.78rem] text-grau">
                  Noch keine Einheiten erfasst — sie entstehen mit der Teilungserklärung.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(Object.keys(EINHEITSSTATUS) as Einheitsstatus[]).map((s) => {
                    const anzahl = d.einheitenJeStatus.get(s) ?? 0;
                    return (
                      <Balken
                        key={s}
                        titel={EINHEITSSTATUS[s].titel}
                        anzahl={anzahl}
                        anteil={d.maxEinheit > 0 ? anzahl / d.maxEinheit : 0}
                        farbe={EINHEITSSTATUS[s].farbe}
                      />
                    );
                  })}
                </div>
              )}
            </Abschnitt>
          </div>

          {/* ----- Absagen ----- */}
          <Abschnitt nummer="05" titel="Nicht zustande gekommen">
            {d.abgesagt.length === 0 ? (
              <p className="text-[0.78rem] text-grau">Keine Absagen hinterlegt.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {d.abgesagt.map((o, i) => (
                  <li
                    key={o.id}
                    className="eintritt flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-linie bg-flaeche px-4 py-3"
                    style={{ animationDelay: `${Math.min(i, 6) * 24}ms` }}
                  >
                    <span className="text-[0.8rem] font-medium text-tinte">{o.strasse}</span>
                    <span className="text-[0.66rem] text-grau">
                      {o.stadt} · {o.stadtteil}
                    </span>
                    <span className="zahl ml-auto shrink-0 text-[0.7rem] text-grau-stark">
                      {f.eur(o.kaufpreis)}
                    </span>
                    {o.notiz && (
                      <p className="w-full text-[0.7rem] leading-relaxed text-grau">{o.notiz}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Abschnitt>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Rechnung                                                             */
/* ------------------------------------------------------------------ */

function auswerten(objekte: Objekt[]) {
  const angekauft = objekte.filter((o) => o.stufe === "angekauft");
  const abgesagt = objekte.filter((o) => o.stufe === "abgesagt");
  const aktiv = objekte.filter((o) => STUFEN[o.stufe].aktiv).length;

  const investiert = angekauft.reduce(
    (s, o) => s + (berechneKennzahlen(o).gesamtinvestition ?? 0),
    0,
  );
  const jahresmiete = angekauft.reduce((s, o) => s + (o.jahresNettokaltmiete ?? 0), 0);
  const mietPotenzial = angekauft.reduce(
    (s, o) => s + Math.max(0, berechneKennzahlen(o).mietePotenzialDelta ?? 0),
    0,
  );
  const kaufpreisSumme = angekauft.reduce((s, o) => s + (o.kaufpreis ?? 0), 0);

  // Gewichtet, nicht gemittelt: ein 2-Mio-Objekt darf nicht so viel zählen
  // wie eine 180-k-Wohnung.
  const faktorMittel = jahresmiete > 0 ? kaufpreisSumme / jahresmiete : null;
  const renditeMittel = kaufpreisSumme > 0 ? (jahresmiete / kaufpreisSumme) * 100 : null;

  const einheiten = angekauft.flatMap((o) => o.einheiten);
  const einheitenJeStatus = new Map<Einheitsstatus, number>();
  for (const e of einheiten) {
    einheitenJeStatus.set(e.status, (einheitenJeStatus.get(e.status) ?? 0) + 1);
  }

  const stadtteile = [...bilanzJeStadtteil(objekte).values()]
    .filter((b) => b.anzahl > 0)
    .sort((a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name));

  const maxVon = (werte: number[]) => Math.max(1, ...werte);

  return {
    angekauft,
    abgesagt,
    aktiv,
    investiert,
    jahresmiete,
    mietPotenzial,
    faktorMittel,
    renditeMittel,
    einheitenGesamt: einheiten.length,
    einheitenJeStatus,
    stadtteile,
    maxStufe: maxVon(STUFEN_REIHENFOLGE.map((s) => objekte.filter((o) => o.stufe === s).length)),
    maxStadtteil: maxVon(stadtteile.map((b) => b.anzahl)),
    maxArt: maxVon(
      (Object.keys(OBJEKTARTEN) as Objektart[]).map(
        (a) => objekte.filter((o) => o.objektart === a).length,
      ),
    ),
    maxEinheit: maxVon([...einheitenJeStatus.values()]),
  };
}

/* ------------------------------------------------------------------ */
/* Bausteine                                                            */
/* ------------------------------------------------------------------ */

function Abschnitt({
  nummer,
  titel,
  children,
}: {
  nummer: string;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 py-8 md:px-10 md:py-10">
      <div className="flex items-baseline gap-3">
        <span className="zahl text-[0.62rem] tracking-wider text-grau">{nummer}</span>
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          {titel}
        </h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Balken({
  titel,
  unten,
  anzahl,
  anteil,
  farbe = "#5b6574",
  rechts,
}: {
  titel: string;
  unten?: string;
  anzahl: number;
  anteil: number;
  /** Ohne Angabe neutrales Grau — Weiß wäre im hellen Layout unsichtbar. */
  farbe?: string;
  rechts?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-[7.5rem] shrink-0 sm:w-[11rem]">
        <div className="truncate text-[0.74rem] text-tinte">{titel}</div>
        {unten && <div className="truncate text-[0.6rem] text-grau">{unten}</div>}
      </div>

      <div className="relative h-5 min-w-0 flex-1 overflow-hidden rounded-full bg-flaeche-hoch">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out-stark"
          style={{ width: `${Math.max(anteil * 100, anzahl > 0 ? 2 : 0)}%`, background: farbe }}
        />
      </div>

      <div className="zahl w-7 shrink-0 text-right text-[0.74rem] font-semibold text-tinte tabular-nums">
        {anzahl}
      </div>
      {rechts !== undefined && (
        <div className="zahl hidden w-28 shrink-0 text-right text-[0.68rem] text-grau sm:block">
          {rechts}
        </div>
      )}
    </div>
  );
}
