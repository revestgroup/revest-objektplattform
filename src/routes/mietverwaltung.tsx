/**
 * Mietverwaltung.
 *
 * Nach dem Verkauf bleibt Revest in der Pflicht: Jeder Käufer hat eine
 * Mietgarantie, und jeden Monat entsteht daraus entweder ein Überschuss oder
 * ein Loch. Diese Seite zeigt zuerst das Loch — alles andere ist nachrangig.
 *
 * Zwei Arten werden getrennt behandelt, weil sie unterschiedlich arbeiten:
 * eine Wohnung ist vermietet oder nicht, eine WG ist es zimmerweise.
 *
 * Vier Reiter auf dieselbe Sache: Einheiten zeigt die Plätze und was sie
 * kosten, Mieter zeigt die Menschen und ihre Akten, Auswertung zeigt, was
 * daraus über die Zeit folgt, Archiv zeigt, was vorbei ist. Ein Leerstand und
 * ein Interessent sind zwei Seiten derselben Münze — nur wird hier nichts
 * verkauft, sondern vermietet.
 *
 * Eine ausgelaufene Garantie wird nicht verschoben, sie fällt aus den ersten
 * drei Reitern heraus und erscheint im vierten. Beides folgt aus demselben
 * gerechneten Status, nie aus einem Haken, den jemand setzen muss.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Schublade, Seitenkopf } from "../components/AppLayout";
import { Auswahlfeld, Bereich, Segmente, Textfeld, Zahlfeld } from "../components/Felder";
import { Mieterliste } from "../components/Mieterliste";
import { Vermietungsauswertung } from "../components/Vermietungsauswertung";
import { MIETERSTATUS, unterlagenstand } from "../lib/mieter";
import { f } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import {
  GARANTIEARTEN,
  GARANTIESTATUS,
  LAUFZEITEN,
  LAUFZEIT_STANDARD,
  berechneGarantie,
  mieterDerGarantie,
  mieterJeDerGarantie,
  zimmerVorschlag,
  type Garantieart,
  type Garantiestatus,
  type Mietgarantie,
} from "../lib/vermietung";
import { useVermietung, type GarantieEntwurf } from "../lib/vermietungStore";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/mietverwaltung")({
  // `?garantie=` kommt aus dem Projekt: dort steht an der verkauften Einheit,
  // dass eine Garantie läuft, und von dort führt der Weg hierher.
  validateSearch: (such: Record<string, unknown>): { garantie?: string } =>
    typeof such.garantie === "string" ? { garantie: such.garantie } : {},
  component: MietverwaltungSeite,
});

type Reiter = "einheiten" | "mieter" | "auswertung" | "archiv";

const REITER: { schluessel: Reiter; titel: string }[] = [
  { schluessel: "einheiten", titel: "Einheiten" },
  { schluessel: "mieter", titel: "Mieter" },
  { schluessel: "auswertung", titel: "Auswertung" },
  { schluessel: "archiv", titel: "Archiv" },
];

function MietverwaltungSeite() {
  const { garantien, mieter } = useVermietung();
  const { garantie: gewuenscht } = Route.useSearch();
  const [reiter, setReiter] = useState<Reiter>("einheiten");
  const [mieterAnlegen, setMieterAnlegen] = useState(false);
  const [garantieAnlegen, setGarantieAnlegen] = useState(false);

  function reiterWaehlen(r: Reiter) {
    setReiter(r);
    setMieterAnlegen(false);
    setGarantieAnlegen(false);
  }

  const ohnePlatz = mieter.filter((m) => MIETERSTATUS[m.status].offen).length;
  const leer = garantien.filter((g) => {
    const k = berechneGarantie(g, mieter);
    return k.status !== "beendet" && k.belegt < k.plaetze;
  }).length;

  return (
    <>
      <Seitenkopf
        titel="Mietverwaltung"
        aktion={
          reiter === "mieter" || reiter === "einheiten" ? (
            <button
              type="button"
              onClick={() =>
                reiter === "mieter" ? setMieterAnlegen(true) : setGarantieAnlegen(true)
              }
              className="druckbar flex items-center gap-2 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
            >
              <Plus size={14} strokeWidth={2.25} />
              {reiter === "mieter" ? "Mieter anlegen" : "Garantie anlegen"}
            </button>
          ) : undefined
        }
      />

      {/* ----- Reiter ----- */}
      <div className="scroll-reihe flex gap-1 overflow-x-auto border-b border-linie px-4 sm:px-6 md:px-10">
        {REITER.map((r) => {
          const an = reiter === r.schluessel;
          // Die Zahl am Reiter ist der Grund hinzuzuschauen: freie Plätze
          // kosten Geld, wartende Mieter können es zurückholen.
          const anzahl =
            r.schluessel === "einheiten" ? leer : r.schluessel === "mieter" ? ohnePlatz : 0;
          return (
            <button
              key={r.schluessel}
              type="button"
              onClick={() => reiterWaehlen(r.schluessel)}
              aria-current={an ? "page" : undefined}
              className={cn(
                "druckbar -mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3.5 text-[0.76rem] font-medium whitespace-nowrap",
                an ? "border-tinte text-tinte" : "border-transparent text-grau hover:text-grau-stark",
              )}
            >
              {r.titel}
              {anzahl > 0 && (
                <span
                  className={cn(
                    "zahl rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold",
                    an ? "bg-tinte text-grund" : "bg-flaeche-aktiv text-grau-stark",
                  )}
                >
                  {anzahl}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {reiter === "einheiten" ? (
        <Garantien
          anlegenOffen={garantieAnlegen}
          anlegenSchliessen={() => setGarantieAnlegen(false)}
          oeffne={gewuenscht}
        />
      ) : reiter === "mieter" ? (
        <Mieterliste
          anlegenOffen={mieterAnlegen}
          anlegenSchliessen={() => setMieterAnlegen(false)}
        />
      ) : reiter === "auswertung" ? (
        <Vermietungsauswertung />
      ) : (
        <Archiv />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Garantien                                                            */
/* ------------------------------------------------------------------ */

function Garantien({
  anlegenOffen,
  anlegenSchliessen,
  oeffne,
}: {
  anlegenOffen: boolean;
  anlegenSchliessen: () => void;
  /** Aus `?garantie=` — wer aus dem Projekt kommt, will diesen Datensatz sehen. */
  oeffne?: string;
}) {
  const { garantien, mieter, bereit } = useVermietung();
  const [artFilter, setArtFilter] = useState<"" | Garantieart>("");
  const [statusFilter, setStatusFilter] = useState<"" | Garantiestatus>("");
  const [detailId, setDetailId] = useState<string | null>(oeffne ?? null);

  const gewaehlt = detailId ? (garantien.find((g) => g.id === detailId) ?? null) : null;

  // Beendete Garantien gehoeren ins Archiv, nicht in die Arbeitsliste. Sonst
  // waere nach zwei Jahren Sechsmonatsgarantien das meiste hier Altpapier.
  const laufende = useMemo(
    () =>
      garantien
        .map((g) => ({ g, k: berechneGarantie(g, mieter) }))
        .filter(({ k }) => k.status !== "beendet"),
    [garantien, mieter],
  );

  const liste = useMemo(() => {
    return laufende
      .filter(({ g, k }) => {
        if (artFilter && g.art !== artFilter) return false;
        if (statusFilter && k.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // Unterdeckung zuerst, danach nach Restlaufzeit. Was Geld kostet,
        // steht oben — nicht was zuerst angelegt wurde.
        if (a.k.deckung < 0 !== b.k.deckung < 0) return a.k.deckung < 0 ? -1 : 1;
        return a.k.restMonate - b.k.restMonate;
      });
  }, [laufende, artFilter, statusFilter]);

  return (
    <>
      {/* ----- Filter ----- */}
      <div className="sticky top-0 z-20 border-b border-linie bg-grund/95 backdrop-blur-sm">
        <div className="scroll-reihe flex gap-2 overflow-x-auto px-6 py-3 md:flex-wrap md:px-10">
          <div className="flex shrink-0 gap-1 rounded-full border border-linie bg-flaeche-hoch p-1">
            {(["", "wohnung", "wg"] as const).map((a) => (
              <button
                key={a || "alle"}
                type="button"
                onClick={() => setArtFilter(a)}
                aria-pressed={artFilter === a}
                className={cn(
                  "druckbar rounded-full px-3 py-1 text-[0.68rem] whitespace-nowrap",
                  artFilter === a ? "bg-tinte text-grund shadow-karte" : "text-grau-stark",
                )}
              >
                {a ? GARANTIEARTEN[a].titel : "Alle Arten"}
              </button>
            ))}
          </div>

          <span aria-hidden className="my-1 w-px shrink-0 bg-linie" />

          {/* „Beendet" fehlt hier bewusst: dafuer ist der Archiv-Reiter da. */}
          {(["aktiv", "auslaufend"] as const).map((s) => {
            const an = statusFilter === s;
            const anzahl = laufende.filter(({ k }) => k.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(an ? "" : s)}
                aria-pressed={an}
                className={cn(
                  "druckbar flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.68rem] whitespace-nowrap",
                  an ? "border-tinte bg-tinte text-grund" : "border-linie bg-flaeche text-grau-stark",
                )}
              >
                <span
                  aria-hidden
                  className="size-[7px] shrink-0 rounded-full"
                  style={{ background: an ? "#ffffff" : GARANTIESTATUS[s].farbe }}
                />
                {GARANTIESTATUS[s].titel}
                <span className="zahl text-[0.6rem] opacity-60">{anzahl}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ----- Liste ----- */}
      {!bereit ? (
        <div className="h-48" />
      ) : liste.length === 0 ? (
        <p className="px-6 py-20 text-center text-[0.85rem] text-grau md:px-10">
          Keine Garantie passt zu diesen Filtern.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 px-6 py-6 md:gap-4 md:px-10 xl:grid-cols-2">
            {liste.map(({ g }, i) => (
              <GarantieKachel
                key={g.id}
                garantie={g}
                verzoegerung={Math.min(i, 8) * 28}
                beiKlick={() => setDetailId(g.id)}
              />
            ))}
          </ul>
          <p className="border-t border-linie px-6 py-5 text-[0.68rem] text-grau md:px-10">
            {liste.length} {liste.length === 1 ? "Garantie" : "Garantien"}
            {/* Verglichen wird mit den laufenden, nicht mit allen: die
                beendeten sind hier nicht gefiltert, sondern gar nicht da. */}
            {liste.length !== laufende.length && ` von ${laufende.length}`}
          </p>
        </>
      )}

      <Schublade
        offen={anlegenOffen || detailId !== null}
        schliessen={() => {
          setDetailId(null);
          anlegenSchliessen();
        }}
        titel={anlegenOffen ? "Garantie anlegen" : (gewaehlt?.adresse ?? "Garantie")}
      >
        {anlegenOffen ? (
          <GarantieFormular
            onFertig={(id) => {
              anlegenSchliessen();
              // Direkt in die neue Garantie: dort werden Zimmer zugeschnitten
              // und Mieter zugeordnet, und genau das ist der nächste Schritt.
              setDetailId(id);
            }}
            onAbbrechen={anlegenSchliessen}
          />
        ) : (
          gewaehlt && <GarantieDetail garantie={gewaehlt} onGeloescht={() => setDetailId(null)} />
        )}
      </Schublade>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Archiv                                                               */
/* ------------------------------------------------------------------ */

/**
 * Ausgelaufene Garantien.
 *
 * Verschoben wird nichts: „beendet" ergibt sich aus Beginn und Laufzeit, also
 * wandert ein Datensatz von selbst hierher, sobald sein letzter Tag vorbei
 * ist. Ein Haken, den jemand setzen müsste, wäre ein Haken, den jemand
 * vergisst.
 *
 * Hier wird nicht gearbeitet, hier wird nachgesehen. Deshalb Zeilen statt
 * Kacheln — Kacheln laden zum Anfassen ein, Zeilen zum Überfliegen — und
 * keine Filter, nur die Jahresmarke als Orientierung.
 */
function Archiv() {
  const { garantien, mieter, bereit } = useVermietung();
  const [detailId, setDetailId] = useState<string | null>(null);

  const gewaehlt = detailId ? (garantien.find((g) => g.id === detailId) ?? null) : null;

  const beendet = useMemo(
    () =>
      garantien
        .map((g) => ({ g, k: berechneGarantie(g, mieter) }))
        .filter(({ k }) => k.status === "beendet")
        // Zuletzt ausgelaufen zuerst: danach wird gesucht, nicht nach 2019.
        .sort((a, b) => b.k.ende.getTime() - a.k.ende.getTime()),
    [garantien, mieter],
  );

  // Jahresmarken statt einer durchlaufenden Liste. Die Liste ist absteigend
  // sortiert, also genügt der Vergleich mit der letzten Gruppe.
  const jahre = useMemo(() => {
    const gruppen: { jahr: number; zeilen: typeof beendet }[] = [];
    for (const e of beendet) {
      const jahr = e.k.ende.getFullYear();
      const letzte = gruppen[gruppen.length - 1];
      if (letzte?.jahr === jahr) letzte.zeilen.push(e);
      else gruppen.push({ jahr, zeilen: [e] });
    }
    return gruppen;
  }, [beendet]);

  // Was Revest über die ganze Laufzeit zugesagt hatte. Eine monatliche
  // Historie wird nicht geführt, also steht hier die Zusage — nicht der
  // tatsächliche Verlauf, den diese Daten nicht hergeben.
  const summe = beendet.reduce((s, { g }) => s + g.garantiemiete * g.laufzeitMonate, 0);

  if (!bereit) return <div className="h-48" />;

  if (beendet.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-24 text-center">
        <Archive size={20} strokeWidth={1.5} className="text-grau" aria-hidden />
        <p className="mt-4 text-[0.85rem] text-grau">Noch keine Garantie ausgelaufen.</p>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-20 flex flex-wrap items-baseline gap-x-8 gap-y-1.5 border-b border-linie bg-grund/95 px-4 py-3.5 backdrop-blur-sm sm:px-6 md:px-10">
        <span className="text-[0.72rem] text-grau-stark">
          <span className="zahl font-semibold text-tinte">{beendet.length}</span> ausgelaufen
        </span>
        <span className="text-[0.72rem] text-grau-stark">
          Garantiesumme <span className="zahl font-semibold text-tinte">{f.eurKurz(summe)}</span>
        </span>
      </div>

      <div className="px-4 pb-12 sm:px-6 md:px-10">
        {jahre.map(({ jahr, zeilen }) => (
          <section key={jahr}>
            <h2 className="zahl mt-8 border-b border-linie pb-2 text-[0.62rem] tracking-[0.18em] text-grau">
              {jahr}
            </h2>
            <ul>
              {zeilen.map(({ g, k }, i) => {
                const bewohner = mieterJeDerGarantie(g, mieter);
                return (
                  <li
                    key={g.id}
                    className="eintritt"
                    style={{ animationDelay: `${Math.min(i, 8) * 24}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => setDetailId(g.id)}
                      className="druckbar flex w-full items-center gap-4 border-b border-linie px-1 py-4 text-left hover:bg-flaeche-hoch"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.88rem] font-semibold text-tinte">
                          {g.adresse}
                        </div>
                        <div className="mt-0.5 truncate text-[0.72rem] text-grau">
                          {g.einheitTitel} · {GARANTIEARTEN[g.art].kurz} · Käufer {g.kaeufer}
                        </div>
                        {/* Auf dem Telefon fällt die Mittelspalte weg — der
                            Zeitraum ist aber das, was im Archiv zählt. */}
                        <div className="zahl mt-1 text-[0.68rem] text-grau sm:hidden">
                          {f.datum(g.beginn)} – {f.datum(k.ende.toISOString())}
                        </div>
                      </div>

                      <div className="hidden w-44 shrink-0 sm:block">
                        <div className="zahl text-[0.74rem] text-tinte">
                          {f.datum(g.beginn)} – {f.datum(k.ende.toISOString())}
                        </div>
                        <div className="mt-0.5 text-[0.66rem] text-grau">
                          {g.laufzeitMonate} Monate · {bewohner.length} Mieter
                        </div>
                      </div>

                      <div className="w-20 shrink-0 text-right sm:w-24">
                        <div className="zahl text-[0.8rem] font-semibold text-tinte">
                          {f.eur(g.garantiemiete)}
                        </div>
                        <div className="mt-0.5 text-[0.62rem] text-grau">pro Monat</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <Schublade
        offen={detailId !== null}
        schliessen={() => setDetailId(null)}
        titel={gewaehlt?.adresse ?? "Garantie"}
      >
        {gewaehlt && <GarantieDetail garantie={gewaehlt} onGeloescht={() => setDetailId(null)} />}
      </Schublade>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Kachel                                                               */
/* ------------------------------------------------------------------ */

function GarantieKachel({
  garantie: g,
  beiKlick,
  verzoegerung,
}: {
  garantie: Mietgarantie;
  beiKlick: () => void;
  verzoegerung: number;
}) {
  const { mieter } = useVermietung();
  const k = berechneGarantie(g, mieter);
  const st = GARANTIESTATUS[k.status];
  const unter = k.deckung < 0;

  return (
    <li className="eintritt" style={{ animationDelay: `${verzoegerung}ms` }}>
      <button
        type="button"
        onClick={beiKlick}
        className="kachel flex w-full flex-col items-stretch rounded-2xl border border-linie bg-flaeche p-5 text-left shadow-karte"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.12em] uppercase"
            style={{ background: st.weich, color: st.tief }}
          >
            <span aria-hidden className="size-[6px] rounded-full" style={{ background: st.farbe }} />
            {st.titel}
          </span>
          <span className="rounded-full border border-linie-stark px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-grau-stark">
            {GARANTIEARTEN[g.art].kurz}
          </span>
          {k.belegt < k.plaetze && k.status !== "beendet" && (
            <span className="rounded-full bg-[#F8DEDC] px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-[#8A2822]">
              {k.plaetze - k.belegt} frei
            </span>
          )}
        </div>

        <div className="mt-3.5 truncate text-[1.02rem] leading-tight font-semibold text-tinte">
          {g.adresse}
        </div>
        <div className="mt-1 truncate text-[0.74rem] text-grau">
          {g.einheitTitel} · Käufer {g.kaeufer}
        </div>

        {/* Drei Zahlen, die die Garantie beschreiben. Die dritte ist die,
            die zählt — deshalb bekommt sie als einzige Farbe. */}
        <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-linie bg-linie">
          {[
            { t: "Garantie", v: f.eur(g.garantiemiete) },
            { t: "Ist-Miete", v: f.eur(k.istMiete) },
          ].map((z) => (
            <div key={z.t} className="bg-flaeche px-3 py-2.5">
              <dt className="mini-label text-[0.55rem]">{z.t}</dt>
              <dd className="zahl mt-1 text-[0.82rem] font-semibold text-tinte">{z.v}</dd>
            </div>
          ))}
          <div className="bg-flaeche px-3 py-2.5">
            <dt className="mini-label text-[0.55rem]">Deckung</dt>
            <dd
              className={cn(
                "zahl mt-1 flex items-center gap-1 text-[0.82rem] font-semibold",
                k.deckung === 0 ? "text-tinte" : unter ? "text-[#8A2822]" : "text-[#0C5E3A]",
              )}
            >
              {k.deckung !== 0 &&
                (unter ? (
                  <ArrowDownRight size={13} strokeWidth={2.25} className="shrink-0" />
                ) : (
                  <ArrowUpRight size={13} strokeWidth={2.25} className="shrink-0" />
                ))}
              {f.eur(Math.abs(k.deckung))}
            </dd>
          </div>
        </dl>

        {/* Belegung als Balken — bei der Wohnung ein Feld, bei der WG mehrere. */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 gap-1" aria-hidden>
            {Array.from({ length: k.plaetze }, (_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{ background: i < k.belegt ? "#17935C" : "#E6E9EE" }}
              />
            ))}
          </div>
          <span className="zahl shrink-0 text-[0.66rem] text-grau">
            {k.belegt}/{k.plaetze} belegt
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-[0.66rem] text-grau">
          <span className="zahl">bis {f.datum(k.ende.toISOString())}</span>
          {/* Im letzten Monat sagt „noch 0 Monate" nichts. Dann zählen Tage:
              drei oder dreissig ist der Unterschied zwischen Panik und Plan. */}
          <span className="zahl">
            {k.status === "beendet"
              ? "ausgelaufen"
              : k.restMonate === 0
                ? `noch ${k.restTage} Tage`
                : `noch ${k.restMonate} Monate`}
          </span>
        </div>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                               */
/* ------------------------------------------------------------------ */

function GarantieDetail({
  garantie: g,
  onGeloescht,
}: {
  garantie: Mietgarantie;
  onGeloescht: () => void;
}) {
  const { mieter, aendern, loeschen, zimmerAnlegen } = useVermietung();
  const k = berechneGarantie(g, mieter);
  const st = GARANTIESTATUS[k.status];

  return (
    <div className="pb-16">
      <div className="px-5 py-6 md:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold tracking-[0.12em] uppercase"
            style={{ background: st.weich, color: st.tief }}
          >
            <span aria-hidden className="size-[6px] rounded-full" style={{ background: st.farbe }} />
            {st.titel}
          </span>
          <span className="rounded-full border border-linie-stark px-2.5 py-1 text-[0.6rem] font-semibold tracking-[0.12em] uppercase text-grau-stark">
            {GARANTIEARTEN[g.art].titel}
          </span>
        </div>

        <h1 className="headline mt-4 text-[1.6rem] md:text-[2rem]">{g.adresse}</h1>
        <p className="mt-2 text-[0.8rem] text-grau">{g.einheitTitel}</p>

        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { t: "Garantiemiete", v: `${f.eur(g.garantiemiete)} / Mon.` },
            { t: "Ist-Miete", v: `${f.eur(k.istMiete)} / Mon.` },
            {
              t: "Deckung",
              v: `${k.deckung < 0 ? "−" : "+"}${f.eur(Math.abs(k.deckung))}`,
              warn: k.deckung < 0,
            },
            // Weiches Trennzeichen: das lange Wort passt auf 375px sonst nicht
            // in die Kachel und würde stumm abgeschnitten.
            { t: "Rest\u00ADverpflichtung", v: f.eurKurz(k.restverpflichtung) },
          ].map((z) => (
            <div key={z.t} className="rounded-xl border border-linie bg-flaeche px-4 py-3.5">
              <dt className="mini-label text-[0.55rem] hyphens-manual">{z.t}</dt>
              <dd
                className={cn(
                  "zahl mt-1.5 text-[0.95rem] font-semibold",
                  z.warn ? "text-[#8A2822]" : "text-tinte",
                )}
              >
                {z.v}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ----- Vertrag ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          Vertrag
        </h2>
        <dl className="mt-4 divide-y divide-linie">
          {[
            ["Käufer", g.kaeufer],
            ["Kontakt", g.kaeuferKontakt ?? "—"],
            ["Verkauft am", g.verkauftAm ? f.datum(g.verkauftAm) : "—"],
            ["Verkaufspreis", f.eur(g.verkaufspreis)],
            ["Garantie ab", f.datum(g.beginn)],
            ["Laufzeit", `${g.laufzeitMonate} Monate`],
            ["Garantie bis", f.datum(k.ende.toISOString())],
          ].map(([t, v]) => (
            <div key={t} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[0.76rem] text-grau">{t}</dt>
              <dd className="zahl text-right text-[0.8rem] text-tinte">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ----- Belegung ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
            {g.art === "wg" ? "Zimmer" : "Mietverhältnis"}
          </h2>
          {g.art === "wg" && (
            <button
              type="button"
              onClick={() => zimmerAnlegen(g.id)}
              className="druckbar flex items-center gap-1.5 rounded-full border border-linie-stark px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.12em] uppercase text-tinte"
            >
              <Plus size={12} strokeWidth={2.25} />
              Zimmer
            </button>
          )}
        </div>

        {g.art === "wg" ? (
          <ul className="mt-4 space-y-2">
            {g.zimmer.map((z) => (
              <Platzzeile key={z.id} garantie={g} zimmerId={z.id} />
            ))}
            {g.zimmer.length === 0 && (
              <li className="rounded-xl border border-dashed border-linie-stark px-4 py-8 text-center text-[0.76rem] text-grau">
                Noch kein Zimmer angelegt.
              </li>
            )}
          </ul>
        ) : (
          <ul className="mt-4">
            <Platzzeile garantie={g} zimmerId={null} />
          </ul>
        )}
      </section>

      {/* ----- Notiz ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          Notiz
        </h2>
        <textarea
          value={g.notiz ?? ""}
          onChange={(e) => aendern(g.id, { notiz: e.target.value.trim() || null })}
          rows={3}
          placeholder="Was zu dieser Garantie zu wissen ist."
          className="mt-3 w-full resize-y border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] leading-relaxed text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
        />
      </section>

      <section className="border-t border-linie px-5 py-6 md:px-7">
        <button
          type="button"
          onClick={() => {
            loeschen(g.id);
            onGeloescht();
          }}
          className="druckbar flex items-center gap-2 rounded-full border border-linie px-4 py-2 text-[0.64rem] font-medium tracking-[0.14em] uppercase text-grau hover:border-[#E3BDB9] hover:text-[#8A2822]"
        >
          <Trash2 size={12} strokeWidth={2} />
          Garantie löschen
        </button>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Garantie anlegen                                                     */
/* ------------------------------------------------------------------ */

const EINGABE =
  "w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none";

function heute(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Eine Garantie entsteht aus einem Verkauf. Deshalb beginnt die Maske mit der
 * verkauften Einheit und füllt Adresse, Käufer, Preis und Kaltmiete von dort —
 * tippen muss man nur, was der Bestand nicht weiß. Objekte, die nicht mehr in
 * der Pipeline stehen, trägt man von Hand ein.
 */
function GarantieFormular({
  onFertig,
  onAbbrechen,
}: {
  onFertig: (id: string) => void;
  onAbbrechen: () => void;
}) {
  const { garantien, anlegen } = useVermietung();
  const { objekte } = useObjekte();

  const [quelle, setQuelle] = useState("");
  const [adresse, setAdresse] = useState("");
  const [einheitTitel, setEinheitTitel] = useState("");
  const [art, setArt] = useState<Garantieart>("wohnung");
  const [kaeufer, setKaeufer] = useState("");
  const [kontakt, setKontakt] = useState("");
  const [verkauftAm, setVerkauftAm] = useState("");
  const [verkaufspreis, setVerkaufspreis] = useState("");
  const [beginn, setBeginn] = useState(heute);
  const [laufzeitWahl, setLaufzeitWahl] = useState(String(LAUFZEIT_STANDARD));
  const [laufzeitFrei, setLaufzeitFrei] = useState(String(LAUFZEIT_STANDARD));
  const [garantiemiete, setGarantiemiete] = useState("");
  const [sollmiete, setSollmiete] = useState("");
  const [zimmerAnzahl, setZimmerAnzahl] = useState("4");
  const [notiz, setNotiz] = useState("");
  const [fehler, setFehler] = useState<Record<string, string>>({});

  // Nur verkaufte und reservierte Einheiten, und keine, die schon eine
  // Garantie trägt — zwei Garantien auf dieselbe Einheit sind ein Fehler.
  const einheiten = useMemo(() => {
    const vergeben = new Set(garantien.map((g) => g.einheitId));
    return objekte.flatMap((o) =>
      o.einheiten
        .filter((e) => ["verkauft", "reserviert"].includes(e.status) && !vergeben.has(e.id))
        .map((e) => ({
          wert: `${o.id}|${e.id}`,
          titel: `${o.strasse}, ${o.stadt} · ${e.bezeichnung}`,
          objekt: o,
          einheit: e,
        })),
    );
  }, [objekte, garantien]);

  function quelleWaehlen(w: string) {
    setQuelle(w);
    const treffer = einheiten.find((x) => x.wert === w);
    if (!treffer) return;
    const { objekt: o, einheit: e } = treffer;
    setAdresse(`${o.strasse}, ${o.plz} ${o.stadt}`);
    setEinheitTitel(e.geschoss ? `${e.bezeichnung} · ${e.geschoss}` : e.bezeichnung);
    setKaeufer(e.kaeufer ?? "");
    setVerkaufspreis(e.verkaufspreis === null ? "" : String(e.verkaufspreis));
    // Die bestehende Kaltmiete ist der naheliegende Vorschlag für beides —
    // garantiert wird in der Regel genau das, was die Einheit heute bringt.
    if (e.kaltmiete) {
      setSollmiete(String(e.kaltmiete));
      setGarantiemiete(String(e.kaltmiete));
    }
  }

  const monate = Math.max(1, Number(laufzeitWahl === "frei" ? laufzeitFrei : laufzeitWahl) || 0);

  const bis = useMemo(() => {
    const d = new Date(beginn || heute());
    d.setMonth(d.getMonth() + monate);
    return d;
  }, [beginn, monate]);

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    const neu: Record<string, string> = {};
    if (!adresse.trim()) neu.adresse = "Adresse fehlt.";
    if (!kaeufer.trim()) neu.kaeufer = "Ohne Käufer gibt es keine Garantie.";
    if (!garantiemiete.trim() || Number(garantiemiete) <= 0)
      neu.garantiemiete = "Die garantierte Miete ist die Verpflichtung.";
    setFehler(neu);
    if (Object.keys(neu).length > 0) return;

    const [objektId, einheitId] = quelle ? quelle.split("|") : [null, null];
    const anzahl = Math.max(1, Number(zimmerAnzahl) || 1);

    const entwurf: GarantieEntwurf = {
      objektId,
      einheitId,
      adresse: adresse.trim(),
      einheitTitel: einheitTitel.trim() || adresse.trim(),
      art,
      kaeufer: kaeufer.trim(),
      kaeuferKontakt: kontakt.trim() || null,
      verkauftAm: verkauftAm ? new Date(verkauftAm).toISOString() : null,
      verkaufspreis: verkaufspreis.trim() === "" ? null : Number(verkaufspreis),
      beginn: new Date(beginn || heute()).toISOString(),
      laufzeitMonate: monate,
      garantiemiete: Number(garantiemiete),
      sollmiete: art === "wg" ? null : sollmiete.trim() === "" ? null : Number(sollmiete),
      zimmer: art === "wg" ? zimmerVorschlag(anzahl, Number(garantiemiete)) : [],
      notiz: notiz.trim() || null,
    };

    onFertig(anlegen(entwurf).id);
  }

  return (
    <form onSubmit={absenden} className="pb-20">
      <Bereich titel="Einheit">
        {einheiten.length > 0 && (
          <Auswahlfeld
            id="quelle"
            label="Verkaufte Einheit"
            wert={quelle}
            setWert={quelleWaehlen}
            optionen={einheiten.map((x) => ({ wert: x.wert, titel: x.titel }))}
            leerText="Nicht aus dem Bestand"
            breit
          />
        )}
        <Textfeld
          id="adresse"
          label="Adresse"
          wert={adresse}
          setWert={setAdresse}
          platzhalter="Zinglerstraße 44, 89073 Ulm"
          pflicht
          fehler={fehler.adresse}
          breit
        />
        <Textfeld
          id="einheitTitel"
          label="Einheit"
          wert={einheitTitel}
          setWert={setEinheitTitel}
          platzhalter="WE 3 · 2. OG"
        />
        <Segmente
          label="Art"
          wert={art}
          setWert={setArt}
          optionen={(["wohnung", "wg"] as const).map((a) => ({
            wert: a,
            titel: GARANTIEARTEN[a].titel,
          }))}
        />
        {art === "wg" && (
          <Zahlfeld
            id="zimmerAnzahl"
            label="Zimmer"
            wert={zimmerAnzahl}
            setWert={setZimmerAnzahl}
            schritt="1"
            hinweis="Werden gleich mit angelegt und danach zugeschnitten."
          />
        )}
      </Bereich>

      <Bereich titel="Käufer">
        <Textfeld
          id="kaeufer"
          label="Käufer"
          wert={kaeufer}
          setWert={setKaeufer}
          pflicht
          fehler={fehler.kaeufer}
        />
        <Textfeld
          id="kontakt"
          label="Kontakt"
          wert={kontakt}
          setWert={setKontakt}
          platzhalter="name@beispiel.de"
        />
        <div>
          <label htmlFor="verkauftAm" className="mini-label block">
            Verkauft am
          </label>
          <input
            id="verkauftAm"
            type="date"
            value={verkauftAm}
            onChange={(ev) => setVerkauftAm(ev.target.value)}
            className={cn(EINGABE, "zahl mt-2")}
          />
        </div>
        <Zahlfeld
          id="verkaufspreis"
          label="Verkaufspreis"
          wert={verkaufspreis}
          setWert={setVerkaufspreis}
          einheit="€"
        />
      </Bereich>

      <Bereich titel="Garantie">
        <div>
          <label htmlFor="beginn" className="mini-label block">
            Garantie ab
          </label>
          <input
            id="beginn"
            type="date"
            value={beginn}
            onChange={(ev) => setBeginn(ev.target.value)}
            className={cn(EINGABE, "zahl mt-2")}
          />
        </div>
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
            id="laufzeitFrei"
            label="Laufzeit in Monaten"
            wert={laufzeitFrei}
            setWert={setLaufzeitFrei}
            schritt="1"
            einheit="Mon."
          />
        )}
        <Zahlfeld
          id="garantiemiete"
          label="Garantiemiete je Monat"
          wert={garantiemiete}
          setWert={setGarantiemiete}
          einheit="€"
          pflicht
          fehler={fehler.garantiemiete}
        />
        {art === "wohnung" && (
          <Zahlfeld
            id="sollmiete"
            label="Sollmiete der Einheit"
            wert={sollmiete}
            setWert={setSollmiete}
            einheit="€"
            hinweis="Was die Wohnung bringen soll. Weicht ab, wenn verhandelt wurde."
          />
        )}
        <Textfeld
          id="notiz"
          label="Notiz"
          wert={notiz}
          setWert={setNotiz}
          zeilen={2}
          platzhalter="Was zu dieser Garantie zu wissen ist."
          breit
        />
      </Bereich>

      {/* Die zwei Zahlen, die am Ende unterschrieben werden. Sie stehen hier,
          weil sie sich aus drei Feldern ergeben und niemand im Kopf rechnen
          soll, was eine Laufzeitänderung kostet. */}
      <section className="px-6 pt-9 md:px-10">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-linie bg-linie">
          <div className="bg-flaeche px-4 py-3">
            <dt className="mini-label text-[0.55rem]">Garantie bis</dt>
            <dd className="zahl mt-1 text-[0.9rem] font-semibold text-tinte">
              {f.datum(bis.toISOString())}
            </dd>
          </div>
          <div className="bg-flaeche px-4 py-3">
            <dt className="mini-label text-[0.55rem]">Gesamt&shy;verpflichtung</dt>
            <dd className="zahl mt-1 text-[0.9rem] font-semibold text-tinte">
              {f.eurKurz(monate * (Number(garantiemiete) || 0))}
            </dd>
          </div>
        </dl>
      </section>

      <div className="sticky bottom-0 mt-9 flex gap-3 border-t border-linie bg-grund/95 px-5 py-4 backdrop-blur-sm md:px-7">
        <button
          type="submit"
          className="druckbar flex-1 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
        >
          Garantie anlegen
        </button>
        <button
          type="button"
          onClick={onAbbrechen}
          className="druckbar rounded-full border border-linie-stark px-5 py-3 text-[0.68rem] font-medium tracking-[0.14em] uppercase text-grau-stark"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Ein Platz                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ein Platz: ein WG-Zimmer oder die ganze Wohnung. Links der Zuschnitt
 * (Bezeichnung, Sollmiete), rechts wer darin sitzt.
 *
 * Belegt wird nicht mehr durch Tippen eines Namens, sondern durch Auswahl
 * eines Mieters. Nur so hat der Name eine Akte hinter sich.
 */
function Platzzeile({ garantie: g, zimmerId }: { garantie: Mietgarantie; zimmerId: string | null }) {
  const { mieter, aendern, zimmerSetzen, zimmerLoeschen, zuordnen, freigeben } = useVermietung();
  const [wahl, setWahl] = useState("");

  const z = zimmerId ? (g.zimmer.find((x) => x.id === zimmerId) ?? null) : null;
  const drin = mieterDerGarantie(g, mieter).find((m) => m.zimmerId === zimmerId) ?? null;
  // Nur wer noch keinen Platz hat, kann einen bekommen.
  const frei = mieter.filter((m) => MIETERSTATUS[m.status].offen);

  return (
    <li className="rounded-xl border border-linie bg-flaeche p-3.5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: drin ? "#17935C" : "#C5453B" }}
        />
        {z ? (
          <input
            value={z.bezeichnung}
            onChange={(e) => zimmerSetzen(g.id, z.id, { bezeichnung: e.target.value })}
            aria-label="Bezeichnung"
            className="min-w-0 flex-1 border-none bg-transparent p-0 text-[0.82rem] font-medium text-tinte focus:outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-[0.82rem] font-medium text-tinte">
            {g.einheitTitel}
          </span>
        )}

        <label className="shrink-0">
          <span className="sr-only">Sollmiete</span>
          <input
            type="number"
            inputMode="numeric"
            value={z ? z.miete || "" : (g.sollmiete ?? "")}
            onChange={(e) =>
              z
                ? zimmerSetzen(g.id, z.id, { miete: Number(e.target.value) || 0 })
                : aendern(g.id, {
                    sollmiete: e.target.value === "" ? null : Number(e.target.value),
                  })
            }
            className="zahl w-20 border border-linie bg-flaeche px-2 py-1.5 text-right text-[0.76rem] text-tinte focus:border-linie-stark focus:outline-none"
          />
        </label>

        {z && (
          <button
            type="button"
            onClick={() => zimmerLoeschen(g.id, z.id)}
            aria-label="Zimmer entfernen"
            className="druckbar flex size-8 shrink-0 items-center justify-center rounded-full text-grau hover:text-[#8A2822]"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="mt-3 border-t border-linie pt-3">
        {drin ? (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.12em] uppercase"
              style={{
                background: MIETERSTATUS[drin.status].weich,
                color: MIETERSTATUS[drin.status].tief,
              }}
            >
              {MIETERSTATUS[drin.status].titel}
            </span>
            <span className="min-w-0 flex-1 truncate text-[0.8rem] font-medium text-tinte">
              {drin.name}
            </span>
            <span className="zahl shrink-0 text-[0.74rem] text-grau">{f.eur(drin.miete)}</span>
            <button
              type="button"
              onClick={() => freigeben(drin.id)}
              className="druckbar flex shrink-0 items-center gap-1.5 rounded-full border border-linie-stark px-3 py-1.5 text-[0.6rem] font-medium tracking-[0.1em] uppercase text-grau-stark"
            >
              <UserMinus size={11} strokeWidth={2} />
              Freigeben
            </button>
          </div>
        ) : frei.length === 0 ? (
          <p className="text-[0.74rem] text-grau">
            Frei — kein Mieter wartet. Über „Mieter" einen anlegen.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={wahl}
              onChange={(e) => setWahl(e.target.value)}
              aria-label="Mieter wählen"
              className="min-w-0 flex-1 border border-linie bg-flaeche px-2.5 py-1.5 text-[0.76rem] text-tinte focus:border-linie-stark focus:outline-none"
            >
              <option value="">Mieter wählen …</option>
              {frei.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {unterlagenstand(m).vollstaendig ? "" : " — Unterlagen offen"}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!wahl}
              onClick={() => {
                zuordnen(wahl, g.id, zimmerId);
                setWahl("");
              }}
              className={cn(
                "druckbar flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.6rem] font-semibold tracking-[0.1em] uppercase",
                wahl ? "bg-tinte text-grund" : "cursor-default bg-flaeche-aktiv text-grau",
              )}
            >
              <UserPlus size={11} strokeWidth={2} />
              Belegen
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
