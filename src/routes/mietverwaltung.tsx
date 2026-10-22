/**
 * Mietverwaltung.
 *
 * Nach dem Verkauf bleibt Revest in der Pflicht: Jeder Käufer hat eine
 * Mietgarantie, und jeden Monat entsteht daraus entweder ein Überschuss oder
 * ein Loch. Diese Seite zeigt zuerst das Loch — alles andere ist nachrangig.
 *
 * Zwei Arten werden getrennt behandelt, weil sie unterschiedlich arbeiten:
 * eine Wohnung ist vermietet oder nicht, eine WG ist es zimmerweise.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, DoorOpen, Plus, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { Schublade, Seitenkopf } from "../components/AppLayout";
import { Auswahlfeld, Bereich, Segmente, Textfeld, Zahlfeld } from "../components/Felder";
import { f } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import {
  GARANTIEARTEN,
  GARANTIESTATUS,
  berechneGarantie,
  type Garantieart,
  type Garantiestatus,
  type Mietgarantie,
} from "../lib/vermietung";
import { useVermietung, type GarantieEntwurf } from "../lib/vermietungStore";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/mietverwaltung")({ component: MietverwaltungSeite });

type Modus = { art: "zu" } | { art: "detail"; id: string } | { art: "anlegen" };

function MietverwaltungSeite() {
  const { garantien, bereit } = useVermietung();
  const [artFilter, setArtFilter] = useState<"" | Garantieart>("");
  const [statusFilter, setStatusFilter] = useState<"" | Garantiestatus>("");
  const [modus, setModus] = useState<Modus>({ art: "zu" });

  const gewaehlt = modus.art === "detail" ? garantien.find((g) => g.id === modus.id) ?? null : null;

  const liste = useMemo(() => {
    const mitZahlen = garantien.map((g) => ({ g, k: berechneGarantie(g) }));
    return mitZahlen
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
  }, [garantien, artFilter, statusFilter]);

  return (
    <>
      <Seitenkopf
        label="Garantie und Vermietung"
        titel="Mietverwaltung"
        beschreibung="Jede verkaufte Einheit läuft mit Mietgarantie weiter. Hier steht, was garantiert ist, was tatsächlich hereinkommt — und was die Differenz kostet."
        aktion={
          <button
            type="button"
            onClick={() => setModus({ art: "anlegen" })}
            className="druckbar flex items-center gap-2 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
          >
            <Plus size={14} strokeWidth={2.25} />
            Garantie anlegen
          </button>
        }
      />

      <Bilanz garantien={garantien} />

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

          {(["aktiv", "auslaufend", "beendet"] as const).map((s) => {
            const an = statusFilter === s;
            const anzahl = garantien.filter((g) => berechneGarantie(g).status === s).length;
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
                beiKlick={() => setModus({ art: "detail", id: g.id })}
              />
            ))}
          </ul>
          <p className="border-t border-linie px-6 py-5 text-[0.68rem] text-grau md:px-10">
            {liste.length} {liste.length === 1 ? "Garantie" : "Garantien"}
            {liste.length !== garantien.length && ` von ${garantien.length}`}
          </p>
        </>
      )}

      <Schublade
        offen={modus.art !== "zu"}
        schliessen={() => setModus({ art: "zu" })}
        titel={modus.art === "anlegen" ? "Mietgarantie anlegen" : (gewaehlt?.adresse ?? "Garantie")}
      >
        {modus.art === "anlegen" && (
          <GarantieFormular
            onFertig={(id) => setModus({ art: "detail", id })}
            onAbbrechen={() => setModus({ art: "zu" })}
          />
        )}
        {modus.art === "detail" && gewaehlt && (
          <GarantieDetail garantie={gewaehlt} onGeloescht={() => setModus({ art: "zu" })} />
        )}
      </Schublade>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bilanz über allem                                                    */
/* ------------------------------------------------------------------ */

function Bilanz({ garantien }: { garantien: Mietgarantie[] }) {
  const z = useMemo(() => {
    const laufend = garantien
      .map((g) => ({ g, k: berechneGarantie(g) }))
      .filter(({ k }) => k.status !== "beendet");
    const garantiert = laufend.reduce((s, { g }) => s + g.garantiemiete, 0);
    const ist = laufend.reduce((s, { k }) => s + k.istMiete, 0);
    const freie = laufend.reduce((s, { k }) => s + (k.plaetze - k.belegt), 0);
    const restverpflichtung = laufend.reduce((s, { k }) => s + k.restverpflichtung, 0);
    return { anzahl: laufend.length, garantiert, ist, deckung: ist - garantiert, freie, restverpflichtung };
  }, [garantien]);

  const unter = z.deckung < 0;

  return (
    <dl className="grid grid-cols-2 gap-3 px-6 py-5 md:px-10 lg:grid-cols-4">
      {[
        {
          titel: "Laufende Garantien",
          wert: String(z.anzahl),
          unten: z.freie === 0 ? "alles belegt" : `${z.freie} Einheiten/Zimmer frei`,
        },
        {
          titel: "Garantiert / Monat",
          wert: f.eur(z.garantiert),
          unten: `${f.eurKurz(z.restverpflichtung)} bis Laufzeitende`,
        },
        { titel: "Ist-Miete / Monat", wert: f.eur(z.ist), unten: "tatsächlich vereinnahmt" },
        {
          titel: "Deckung / Monat",
          wert: `${unter ? "−" : "+"}${f.eur(Math.abs(z.deckung))}`,
          unten: unter ? "zahlt Revest zu" : "Überschuss",
          warnung: unter,
        },
      ].map((k, i) => (
        <div
          key={k.titel}
          className={cn(
            "eintritt rounded-2xl border bg-flaeche px-4 py-4 md:px-5",
            k.warnung ? "border-[#E3BDB9]" : "border-linie",
          )}
          style={{ animationDelay: `${i * 28}ms` }}
        >
          <dt className="mini-label">{k.titel}</dt>
          <dd
            className={cn(
              "zahl mt-2 text-[1.3rem] leading-none font-semibold md:text-[1.6rem]",
              k.warnung ? "text-[#8A2822]" : "text-tinte",
            )}
          >
            {k.wert}
          </dd>
          <div className="mt-1.5 text-[0.65rem] text-grau">{k.unten}</div>
        </div>
      ))}
    </dl>
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
  const k = berechneGarantie(g);
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
          <span className="zahl">
            {k.status === "beendet" ? "ausgelaufen" : `noch ${k.restMonate} Monate`}
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
  const { aendern, loeschen, zimmerSetzen, zimmerAnlegen, zimmerLoeschen } = useVermietung();
  const k = berechneGarantie(g);
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
              <li
                key={z.id}
                className="rounded-xl border border-linie bg-flaeche p-3.5 md:flex md:items-center md:gap-3"
              >
                <div className="flex items-center gap-3 md:w-44 md:shrink-0">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: z.mieter ? "#17935C" : "#C5453B" }}
                  />
                  <input
                    value={z.bezeichnung}
                    onChange={(e) => zimmerSetzen(g.id, z.id, { bezeichnung: e.target.value })}
                    aria-label="Bezeichnung"
                    className="min-w-0 flex-1 border-none bg-transparent p-0 text-[0.82rem] font-medium text-tinte focus:outline-none"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:flex md:flex-1 md:items-center md:gap-3">
                  <label className="min-w-0 md:flex-1">
                    <span className="mini-label block text-[0.52rem]">Mieter</span>
                    <input
                      value={z.mieter ?? ""}
                      onChange={(e) =>
                        zimmerSetzen(g.id, z.id, { mieter: e.target.value.trim() || null })
                      }
                      placeholder="frei"
                      className="mt-1 w-full border border-linie bg-flaeche px-2.5 py-1.5 text-[0.78rem] text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
                    />
                  </label>
                  <label className="min-w-0 md:w-28">
                    <span className="mini-label block text-[0.52rem]">Kaltmiete</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={z.miete || ""}
                      onChange={(e) => zimmerSetzen(g.id, z.id, { miete: Number(e.target.value) || 0 })}
                      className="zahl mt-1 w-full border border-linie bg-flaeche px-2.5 py-1.5 text-[0.78rem] text-tinte focus:border-linie-stark focus:outline-none"
                    />
                  </label>
                </div>

                <div className="mt-3 flex items-center gap-2 md:mt-0 md:shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      zimmerSetzen(g.id, z.id, {
                        mieter: z.mieter ? null : "Neuer Mieter",
                        einzugAm: z.mieter ? null : new Date().toISOString(),
                      })
                    }
                    className="druckbar flex items-center gap-1.5 rounded-full border border-linie-stark px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.1em] uppercase text-grau-stark"
                  >
                    {z.mieter ? (
                      <>
                        <DoorOpen size={12} strokeWidth={2} />
                        Freiräumen
                      </>
                    ) : (
                      <>
                        <UserPlus size={12} strokeWidth={2} />
                        Belegen
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => zimmerLoeschen(g.id, z.id)}
                    aria-label="Zimmer entfernen"
                    className="druckbar flex size-8 items-center justify-center rounded-full text-grau hover:text-[#8A2822]"
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            ))}
            {g.zimmer.length === 0 && (
              <li className="rounded-xl border border-dashed border-linie-stark px-4 py-8 text-center text-[0.76rem] text-grau">
                Noch kein Zimmer angelegt.
              </li>
            )}
          </ul>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mini-label block">Mieter</span>
              <input
                value={g.mieter ?? ""}
                onChange={(e) => aendern(g.id, { mieter: e.target.value.trim() || null })}
                placeholder="Leerstand"
                className="mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
              />
            </label>
            <label>
              <span className="mini-label block">Kaltmiete / Monat</span>
              <input
                type="number"
                inputMode="numeric"
                value={g.istMiete ?? ""}
                onChange={(e) =>
                  aendern(g.id, { istMiete: e.target.value === "" ? null : Number(e.target.value) })
                }
                className="zahl mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none"
              />
            </label>
            {!g.mieter && (
              <p className="text-[0.72rem] leading-relaxed text-[#8A2822] sm:col-span-2">
                Leerstand — Revest zahlt die Garantie von {f.eur(g.garantiemiete)} aktuell
                vollständig aus eigener Tasche.
              </p>
            )}
          </div>
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
          className="druckbar flex items-center gap-2 border border-linie px-4 py-2 text-[0.64rem] font-medium tracking-[0.14em] uppercase text-grau hover:border-[#E3BDB9] hover:text-[#8A2822]"
        >
          <Trash2 size={12} strokeWidth={2} />
          Garantie löschen
        </button>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Anlegen                                                              */
/* ------------------------------------------------------------------ */

function GarantieFormular({
  onFertig,
  onAbbrechen,
}: {
  onFertig: (id: string) => void;
  onAbbrechen: () => void;
}) {
  const { anlegen } = useVermietung();
  const { objekte } = useObjekte();

  const [art, setArt] = useState<Garantieart>("wohnung");
  const [objektId, setObjektId] = useState("");
  const [adresse, setAdresse] = useState("");
  const [einheitTitel, setEinheitTitel] = useState("");
  const [kaeufer, setKaeufer] = useState("");
  const [kontakt, setKontakt] = useState("");
  const [verkaufspreis, setVerkaufspreis] = useState("");
  const [beginn, setBeginn] = useState(() => new Date().toISOString().slice(0, 10));
  const [laufzeit, setLaufzeit] = useState("36");
  const [garantiemiete, setGarantiemiete] = useState("");
  const [mieter, setMieter] = useState("");
  const [istMiete, setIstMiete] = useState("");
  const [anzahlZimmer, setAnzahlZimmer] = useState("4");
  const [fehler, setFehler] = useState<Record<string, string>>({});

  // Objekt gewählt? Dann Adresse und Einheiten daraus vorbelegen.
  const objekt = objekte.find((o) => o.id === objektId) ?? null;

  function objektWaehlen(id: string) {
    setObjektId(id);
    const o = objekte.find((x) => x.id === id);
    if (!o) return;
    setAdresse(`${o.strasse}, ${o.plz} ${o.stadt}`);
    if (o.vertriebsweg === "wg") {
      setArt("wg");
      if (o.wgZimmer) setAnzahlZimmer(String(o.wgZimmer));
    }
  }

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    const neu: Record<string, string> = {};
    if (!adresse.trim()) neu.adresse = "Adresse fehlt.";
    if (!kaeufer.trim()) neu.kaeufer = "Käufer fehlt.";
    if (!garantiemiete.trim() || Number(garantiemiete) <= 0)
      neu.garantiemiete = "Garantiemiete fehlt.";
    setFehler(neu);
    if (Object.keys(neu).length > 0) return;

    const zahl = (v: string) => (v.trim() === "" ? null : Number(v));
    const anzahl = Math.max(1, Math.min(12, Number(anzahlZimmer) || 1));
    const proZimmer = Math.round(Number(garantiemiete) / anzahl);

    const entwurf: GarantieEntwurf = {
      objektId: objektId || null,
      einheitId: null,
      adresse: adresse.trim(),
      einheitTitel: einheitTitel.trim() || (art === "wg" ? `WG · ${anzahl} Zimmer` : "Wohnung"),
      art,
      kaeufer: kaeufer.trim(),
      kaeuferKontakt: kontakt.trim() || null,
      verkauftAm: new Date(beginn).toISOString(),
      verkaufspreis: zahl(verkaufspreis),
      beginn: new Date(beginn).toISOString(),
      laufzeitMonate: Number(laufzeit) || 36,
      garantiemiete: Number(garantiemiete),
      mieter: art === "wohnung" ? mieter.trim() || null : null,
      istMiete: art === "wohnung" ? zahl(istMiete) : null,
      zimmer:
        art === "wg"
          ? Array.from({ length: anzahl }, (_, i) => ({
              id: `z${i + 1}-${Date.now().toString(36)}`,
              bezeichnung: `Zimmer ${i + 1}`,
              flaeche: null,
              // Garantiesumme gleichmäßig verteilt — Timo justiert danach
              // zimmerweise nach, wenn die Verträge da sind.
              miete: proZimmer,
              mieter: null,
              einzugAm: null,
            }))
          : [],
      notiz: null,
    };

    onFertig(anlegen(entwurf).id);
  }

  return (
    <form onSubmit={absenden} className="pb-20">
      <Bereich
        titel="Einheit"
        hinweis="Entweder ein Objekt aus dem Bestand wählen oder die Adresse frei eintragen — für Einheiten aus abgeschlossenen Projekten."
      >
        <Auswahlfeld
          id="objekt"
          label="Objekt aus dem Bestand"
          wert={objektId}
          setWert={objektWaehlen}
          leerText="Ohne Objektbezug"
          optionen={objekte.map((o) => ({
            wert: o.id,
            titel: `${o.strasse}, ${o.stadt}`,
          }))}
          breit
        />
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
          id="einheit"
          label="Einheit"
          wert={einheitTitel}
          setWert={setEinheitTitel}
          platzhalter="WE 3 · 2. OG"
          hinweis={objekt ? `${objekt.einheiten.length} Einheiten am Objekt hinterlegt` : undefined}
        />
        <Segmente
          label="Art der Garantie"
          wert={art}
          setWert={setArt}
          optionen={[
            { wert: "wohnung", titel: "Wohnung" },
            { wert: "wg", titel: "WG-Vermietung" },
          ]}
        />
      </Bereich>

      <Bereich titel="Käufer">
        <Textfeld
          id="kaeufer"
          label="Name"
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
          platzhalter="E-Mail oder Telefon"
        />
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
            Beginn
          </label>
          <input
            id="beginn"
            type="date"
            value={beginn}
            onChange={(e) => setBeginn(e.target.value)}
            className="mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none"
          />
        </div>
        <Auswahlfeld
          id="laufzeit"
          label="Laufzeit"
          wert={laufzeit}
          setWert={setLaufzeit}
          optionen={[12, 24, 36, 48, 60].map((m) => ({
            wert: String(m),
            titel: `${m} Monate`,
          }))}
        />
        <Zahlfeld
          id="garantiemiete"
          label="Garantiemiete je Monat"
          wert={garantiemiete}
          setWert={setGarantiemiete}
          einheit="€"
          pflicht
          fehler={fehler.garantiemiete}
          hinweis="Kaltmiete, die dem Käufer zugesichert wird."
        />
        {art === "wg" && (
          <Zahlfeld
            id="zimmer"
            label="Anzahl Zimmer"
            wert={anzahlZimmer}
            setWert={setAnzahlZimmer}
            hinweis="Die Garantiesumme wird gleichmäßig verteilt und kann danach je Zimmer angepasst werden."
          />
        )}
      </Bereich>

      {art === "wohnung" && (
        <Bereich titel="Aktuelles Mietverhältnis" hinweis="Leer lassen, wenn die Wohnung leer steht.">
          <Textfeld id="mieter" label="Mieter" wert={mieter} setWert={setMieter} />
          <Zahlfeld
            id="istmiete"
            label="Kaltmiete je Monat"
            wert={istMiete}
            setWert={setIstMiete}
            einheit="€"
          />
        </Bereich>
      )}

      <div className="sticky bottom-0 flex gap-3 border-t border-linie bg-grund/95 px-5 py-4 backdrop-blur-sm md:px-7">
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
