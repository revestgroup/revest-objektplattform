/**
 * Die Startseite.
 *
 * Vorher landete man auf der Karte. Die Karte beantwortet aber nur eine Frage
 * („wo?“), und das ist selten die erste des Tages. Hier steht stattdessen der
 * Stand: was in Prüfung ist, was überfällig ist, was frei steht — und jede
 * Zahl ist der Weg dorthin. Die Karte ist eine Kachel unter anderen.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  ChevronRight,
  KeyRound,
  ListChecks,
  Map,
  Search,
} from "lucide-react";
import { useMemo } from "react";

import { STUFEN, f, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { fristText, sortiereOffen, tageBis, type Aufgabe } from "../lib/aufgaben";
import { useAufgaben } from "../lib/aufgabenStore";
import { berechneGarantie, freiePlaetze } from "../lib/vermietung";
import { useVermietung } from "../lib/vermietungStore";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/dashboard")({ component: DashboardSeite });

function DashboardSeite() {
  const { objekte, bereit: objekteBereit } = useObjekte();
  const { aufgaben, bereit: aufgabenBereit } = useAufgaben();
  const { garantien, mieter, bereit: vermietungBereit } = useVermietung();

  const bereit = objekteBereit && aufgabenBereit && vermietungBereit;

  const d = useMemo(() => {
    const inPruefung = objekte.filter((o) => STUFEN[o.stufe].aktiv);
    const angekauft = objekte.filter((o) => o.stufe === "angekauft");
    const offen = aufgaben.filter((a) => !a.erledigtAm).sort(sortiereOffen);
    const laufend = garantien
      .map((g) => berechneGarantie(g, mieter))
      .filter((k) => k.status !== "beendet");

    return {
      inPruefung,
      angekauft,
      offen,
      ueberfaellig: offen.filter((a) => {
        const t = tageBis(a.faelligAm);
        return t !== null && t < 0;
      }).length,
      pipeline: inPruefung.reduce((s, o) => s + (o.kaufpreis ?? 0), 0),
      laufendeGarantien: laufend.length,
      auslaufend: laufend.filter((k) => k.status === "auslaufend").length,
      frei: freiePlaetze(garantien, mieter).length,
      stadtteile: new Set(objekte.map((o) => `${o.stadt}|${o.stadtteil}`)).size,
    };
  }, [objekte, aufgaben, garantien, mieter]);

  if (!bereit) return <div className="h-96" />;

  return (
    <div className="px-4 py-5 pb-10 sm:px-6 md:px-10 md:py-8">
      <h1 className="headline text-[1.6rem] md:text-[2.1rem]">Übersicht</h1>

      {/* ----- Zahlen, jede ein Weg ----- */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 md:mt-7 md:grid-cols-4 md:gap-3">
        <Zahl
          zu="/ankauf"
          titel="In Prüfung"
          wert={String(d.inPruefung.length)}
          unten={d.pipeline > 0 ? f.eurKurz(d.pipeline) : "—"}
        />
        <Zahl
          zu="/projekte"
          titel="Angekauft"
          wert={String(d.angekauft.length)}
          unten={`${d.angekauft.reduce((s, o) => s + o.einheiten.length, 0)} Einheiten`}
        />
        <Zahl
          zu="/aufgaben"
          titel="Aufgaben"
          wert={String(d.offen.length)}
          unten={d.ueberfaellig > 0 ? `${d.ueberfaellig} überfällig` : "nichts überfällig"}
          warnt={d.ueberfaellig > 0}
        />
        <Zahl
          zu="/mietverwaltung"
          titel="Garantien"
          wert={String(d.laufendeGarantien)}
          unten={
            d.auslaufend > 0
              ? `${d.auslaufend} ${d.auslaufend === 1 ? "läuft" : "laufen"} aus`
              : `${d.frei} Plätze frei`
          }
          warnt={d.auslaufend > 0}
        />
      </div>

      {/* ----- Karte und Nächstes ----- */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Link
          to="/karte"
          className="kachel group flex min-h-[11rem] flex-col justify-between overflow-hidden rounded-2xl border border-linie bg-tinte p-5 text-grund shadow-karte md:p-6"
        >
          {/* Die Kachel trägt die Markenfarbe, weil die Karte der einzige Ort
              ist, an dem alle Objekte gleichzeitig sichtbar sind. */}
          <Map size={26} strokeWidth={1.6} className="opacity-70" />
          <div>
            <div className="headline text-[1.5rem] md:text-[1.8rem]">Karte</div>
            <div className="mt-2 flex items-center gap-1.5 text-[0.74rem] text-grund/70">
              <span className="zahl tabular-nums">{objekte.length}</span>
              <span>Objekte in {d.stadtteile} Stadtteilen</span>
              <ChevronRight
                size={14}
                strokeWidth={2}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </div>
          </div>
        </Link>

        <section className="rounded-2xl border border-linie bg-flaeche p-5 shadow-karte md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
              Als Nächstes
            </h2>
            <Link
              to="/aufgaben"
              className="druckbar rounded-full px-2.5 py-1 text-[0.68rem] font-medium text-grau-stark hover:text-tinte"
            >
              Alle
            </Link>
          </div>

          {d.offen.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-linie-stark px-4 py-8 text-center text-[0.76rem] text-grau">
              Nichts offen.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-linie">
              {d.offen.slice(0, 4).map((a) => (
                <Aufgabenzeile key={a.id} aufgabe={a} objekte={objekte} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ----- Bereiche ----- */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-5 md:gap-3">
        <Kachel zu="/ankauf" titel="Ankauf" Zeichen={Search} />
        <Kachel zu="/projekte" titel="Projekte" Zeichen={Building2} />
        <Kachel zu="/aufgaben" titel="Aufgaben" Zeichen={ListChecks} />
        <Kachel zu="/mietverwaltung" titel="Mietverwaltung" Zeichen={KeyRound} />
        <Kachel zu="/auswertung" titel="Auswertung" Zeichen={BarChart3} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Zahl({
  zu,
  titel,
  wert,
  unten,
  warnt,
}: {
  zu: string;
  titel: string;
  wert: string;
  unten: string;
  warnt?: boolean;
}) {
  return (
    <Link
      to={zu}
      className="kachel min-w-0 rounded-2xl border border-linie bg-flaeche px-4 py-4 shadow-karte md:px-5 md:py-5"
    >
      <div className="mini-label truncate">{titel}</div>
      <div className="zahl mt-2 text-[1.6rem] leading-none font-semibold text-tinte md:text-[2rem]">
        {wert}
      </div>
      {/* Rot steht in der Unterzeile, nicht auf der Zahl: „4 Garantien“ ist
          keine Warnung, „1 läuft aus“ schon. */}
      <div
        className={cn("mt-2 truncate text-[0.68rem]", warnt ? "font-medium" : "text-grau")}
        style={warnt ? { color: STUFEN.abgesagt.farbe } : undefined}
      >
        {unten}
      </div>
    </Link>
  );
}

function Kachel({
  zu,
  titel,
  Zeichen,
}: {
  zu: string;
  titel: string;
  Zeichen: typeof Search;
}) {
  return (
    <Link
      to={zu}
      className="kachel flex min-w-0 items-center gap-2.5 rounded-2xl border border-linie bg-flaeche px-4 py-4 shadow-karte"
    >
      <Zeichen size={17} strokeWidth={1.7} className="shrink-0 text-grau-stark" />
      <span className="min-w-0 truncate text-[0.8rem] font-medium text-tinte">{titel}</span>
    </Link>
  );
}

function Aufgabenzeile({ aufgabe, objekte }: { aufgabe: Aufgabe; objekte: Objekt[] }) {
  const tage = tageBis(aufgabe.faelligAm);
  const spaet = tage !== null && tage < 0;
  const objekt = aufgabe.objektId ? objekte.find((o) => o.id === aufgabe.objektId) : undefined;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8rem] text-tinte">{aufgabe.titel}</span>
        {objekt && (
          <span className="mt-0.5 block truncate text-[0.66rem] text-grau">{objekt.strasse}</span>
        )}
      </span>
      <span
        className={cn(
          "zahl shrink-0 text-[0.68rem] tabular-nums",
          spaet ? "font-semibold" : "text-grau",
        )}
        style={spaet ? { color: STUFEN.abgesagt.farbe } : undefined}
      >
        {fristText(aufgabe.faelligAm)}
      </span>
    </li>
  );
}
