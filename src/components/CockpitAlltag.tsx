/**
 * Cockpit · Reiter Alltag (Ausbau 4, P2).
 *
 * Kennzahlen, Sprint als Zeitleiste, Gedanken-Eingang, Entscheidungen,
 * „Heute auf dem Tisch“, Kalender heute und die Postfächer. Alle Zahlen aus
 * den vorhandenen Daten; nichts aus dem Layout-Entwurf.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Plus, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { useAngebotUebernehmen } from "./Eingang";
import { fristText, tageBis, type Aufgabe } from "../lib/aufgaben";
import { useAufgaben } from "../lib/aufgabenStore";
import { WEITERLEITUNGEN, haengtFest } from "../lib/backoffice";
import { useBackoffice } from "../lib/backofficeStore";
import {
  GEDANKENZIELE,
  googleTerminAdresse,
  jetztLage,
  kennzahlen,
  montagVon,
  sichtbareGedanken,
  sprintEintraege,
  sprintfenster,
  sprintZeilen,
  tagIso,
  tagesbeginn,
  uhrzeitAm,
  vermerkGilt,
  zeileSichtbar,
  type Frage,
  type Gedanke,
  type Sprintansicht,
  type Sprintbalken,
  type Sprinteintrag,
  type Sprintpunkt,
  type Tischwahl,
} from "../lib/cockpit";
import { useCockpit } from "../lib/cockpitStore";
import { EINGANGSQUELLEN, profilAbweichungen, type Angebotseingang } from "../lib/eingang";
import { useEingang } from "../lib/eingangStore";
import { useEinstellungen } from "../lib/einstellungenStore";
import { offeneKaeuferanteile } from "../lib/nachberechnung";
import { OBJEKTARTEN, f, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { terminText } from "../lib/aktivitaeten";
import { UMMELDEARTEN, ueberfaelligeUmmeldungen } from "../lib/ummeldungen";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/* Farben                                                               */
/* ------------------------------------------------------------------ */

type Ton = "rot" | "gelb" | "gruen" | "blau" | "grau" | "dunkel";

const TON: Record<Ton, string> = {
  rot: "bg-[#FBE2E2] text-[#9A2727]",
  gelb: "bg-[#FBEBD1] text-[#8A5A08]",
  gruen: "bg-[#DBF2E6] text-[#0C5E3A]",
  blau: "bg-[#E4EAF2] text-[#38506E]",
  grau: "bg-flaeche-hoch text-grau-stark",
  dunkel: "bg-tinte text-grund",
};

const BALKEN: Record<Sprinteintrag["farbe"], string> = {
  dunkel: "#10131A",
  gold: "#A9740F",
  gruen: "#17935C",
  blau: "#38506E",
  grau: "#636A74",
};

function Plakette({
  ton,
  children,
  className,
}: {
  ton: Ton;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold whitespace-nowrap",
        TON[ton],
        className,
      )}
    >
      {children}
    </span>
  );
}

function Karte({
  titel,
  zusatz,
  aktion,
  children,
  className,
}: {
  titel: string;
  zusatz?: ReactNode;
  aktion?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("min-w-0 rounded-2xl border border-linie bg-flaeche shadow-karte", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-2 md:px-6">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          {titel}
        </h2>
        <div className="flex items-center gap-2">
          {zusatz && <span className="zahl text-[0.68rem] text-grau">{zusatz}</span>}
          {aktion}
        </div>
      </div>
      {children}
    </section>
  );
}

const pille =
  "druckbar rounded-full border border-linie px-2.5 py-1 text-[0.64rem] font-semibold whitespace-nowrap text-grau-stark hover:border-tinte hover:text-tinte";
const pilleAn = "border-tinte bg-tinte text-grund hover:text-grund";
const feld =
  "h-9 w-full min-w-0 rounded-lg border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";

const objektName = (o: Objekt) =>
  `${o.kuerzel ? `${o.kuerzel} · ` : ""}${o.bezeichnung?.trim() || o.strasse}`;
const objektZiel = (o: Objekt) => ({
  to: o.stufe === "angekauft" ? ("/projekte" as const) : ("/ankauf" as const),
  search: { objekt: o.id },
});

/* ------------------------------------------------------------------ */
/* Reiter                                                               */
/* ------------------------------------------------------------------ */

export function CockpitAlltag() {
  return (
    <div className="flex flex-col gap-3">
      <Kennzahlleiste />
      <Sprint />
      {/* Links das, was entschieden werden will; rechts Kalender und Postfächer. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Gedankeneingang />
          <Entscheidungen />
          <Tisch />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <KalenderHeute />
          <Postfaecher />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kennzahlen                                                           */
/* ------------------------------------------------------------------ */

function Kennzahlleiste() {
  const { objekte } = useObjekte();
  const { eingaenge } = useEingang();
  const { vorgaben, ziele } = useEinstellungen();
  const liste = useMemo(
    () => kennzahlen(objekte, eingaenge, vorgaben, ziele),
    [objekte, eingaenge, vorgaben, ziele],
  );
  const wert = (n: number, geld: boolean) => (geld ? f.eurKurz(n) : n.toLocaleString("de-DE"));

  return (
    <Link
      to="/auswertung"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      aria-label="Zur Auswertung"
    >
      {liste.map((k) => {
        const anteil = k.ziel ? Math.min(1, Math.max(0, k.ist / k.ziel)) : null;
        return (
          <div
            key={k.titel}
            className="druckbar flex min-w-0 flex-col gap-1.5 rounded-xl border border-linie bg-flaeche px-4 py-3 shadow-karte"
          >
            <span className="mini-label truncate">{k.titel}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="headline zahl text-[1.3rem] leading-none">
                {wert(k.ist, k.geld)}
              </span>
              {k.ziel !== null && (
                <span className="zahl text-[0.7rem] text-grau">/ {wert(k.ziel, k.geld)}</span>
              )}
            </span>
            {anteil !== null ? (
              <span className="h-1.5 overflow-hidden rounded-full bg-flaeche-aktiv">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${anteil * 100}%`,
                    background: k.farbe === "gold" ? BALKEN.gold : BALKEN.gruen,
                  }}
                />
              </span>
            ) : (
              <span className="text-[0.6rem] text-grau">kein Ziel gesetzt</span>
            )}
          </div>
        );
      })}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Sprint                                                               */
/* ------------------------------------------------------------------ */

const ANSICHTEN: [Sprintansicht, string][] = [
  ["tag", "Tag"],
  ["woche", "Woche"],
  ["monat", "Monat"],
];

const LABEL_BREITE = "7.5rem";

function Sprint() {
  const { aufgaben } = useAufgaben();
  const { objekte } = useObjekte();
  const { sprintpunkte, bereiche } = useCockpit();
  const navigate = useNavigate();
  const [ansicht, setAnsicht] = useState<Sprintansicht>("tag");
  const [tag, setTag] = useState(() => tagesbeginn(new Date()));
  const [formular, setFormular] = useState<Sprintpunkt | "neu" | null>(null);

  const fenster = sprintfenster(ansicht, tag);
  const zeilen = useMemo(() => {
    const stufe = (id: string) => objekte.find((o) => o.id === id)?.stufe ?? null;
    return sprintZeilen(sprintEintraege(aufgaben, sprintpunkte, stufe), fenster, ansicht, bereiche);
  }, [aufgaben, sprintpunkte, objekte, fenster, ansicht, bereiche]);
  const jetzt = ansicht === "tag" ? jetztLage(fenster) : null;

  const heute = tagesbeginn(new Date());
  const montag = montagVon(heute);
  const tage = Array.from(
    { length: 14 },
    (_, i) => new Date(montag.getFullYear(), montag.getMonth(), montag.getDate() + i),
  );

  function oeffnen(b: Sprintbalken) {
    if (b.ziel.art === "sprint") {
      const id = b.ziel.id;
      setFormular(sprintpunkte.find((p) => p.id === id) ?? null);
      return;
    }
    const objektId = b.ziel.objektId;
    const o = objektId ? objekte.find((x) => x.id === objektId) : null;
    if (o) navigate(objektZiel(o));
    else navigate({ to: "/aufgaben" });
  }

  return (
    <Karte
      titel={`Sprint · ${fenster.titel}`}
      aktion={
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Zeitraum"
            className="flex gap-0.5 rounded-full border border-linie bg-flaeche-hoch p-0.5"
          >
            {ANSICHTEN.map(([w, t]) => (
              <button
                key={w}
                type="button"
                aria-pressed={ansicht === w}
                onClick={() => setAnsicht(w)}
                className={cn(
                  "druckbar rounded-full px-3 py-1 text-[0.66rem] font-semibold",
                  ansicht === w ? "bg-tinte text-grund" : "text-grau-stark hover:text-tinte",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFormular("neu")}
            className="druckbar flex items-center gap-1 rounded-full bg-tinte px-3 py-1.5 text-[0.66rem] font-semibold text-grund"
          >
            <Plus size={12} strokeWidth={2.25} />
            Sprint-Punkt
          </button>
        </div>
      }
    >
      {formular && (
        <Sprintformular
          key={formular === "neu" ? "neu" : formular.id}
          punkt={formular === "neu" ? null : formular}
          tag={tag}
          schliessen={() => setFormular(null)}
        />
      )}

      {ansicht === "tag" && (
        <div
          role="group"
          aria-label="Tag wählen"
          className="flex gap-1.5 overflow-x-auto px-5 pt-1 pb-3 md:px-6"
        >
          {tage.map((d) => {
            const gewaehlt = tagIso(d) === tagIso(tag);
            const istHeute = tagIso(d) === tagIso(heute);
            const wochenende = d.getDay() === 0 || d.getDay() === 6;
            return (
              <button
                key={tagIso(d)}
                type="button"
                onClick={() => setTag(d)}
                aria-pressed={gewaehlt}
                aria-label={d.toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                className="druckbar flex min-w-11 flex-col items-center gap-1 text-[0.6rem] text-grau"
              >
                <span
                  className={cn(
                    "zahl flex size-9 items-center justify-center rounded-full border text-[0.78rem] font-semibold",
                    gewaehlt
                      ? "border-tinte bg-tinte text-grund"
                      : wochenende
                        ? "border-flaeche-hoch bg-flaeche-hoch text-grau"
                        : "border-linie bg-flaeche text-tinte",
                    istHeute && !gewaehlt && "border-tinte",
                  )}
                >
                  {d.getDate()}
                </span>
                {d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")}
              </button>
            );
          })}
        </div>
      )}

      <div className="overflow-x-auto px-5 pb-4 md:px-6">
        <div className="relative min-w-[640px]">
          {jetzt !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 bottom-6 z-10 border-l-[1.5px] border-dashed border-[#C94A4A]"
              style={{ left: `calc(${LABEL_BREITE} + (100% - ${LABEL_BREITE}) * ${jetzt})` }}
            >
              <span className="zahl absolute -top-0.5 left-1 rounded bg-flaeche px-1 text-[0.58rem] font-bold text-[#B03A3A]">
                jetzt{" "}
                {new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
          {zeilen.map((z) => (
            <div
              key={z.bereich}
              className="grid items-center border-t border-dashed border-linie"
              style={{ gridTemplateColumns: `${LABEL_BREITE} minmax(0,1fr)` }}
            >
              <span className="truncate pr-2 text-[0.72rem] font-medium text-grau-stark">
                {z.bereich}
              </span>
              <div className="relative" style={{ height: `${0.4 + z.spuren * 2.85}rem` }}>
                {z.balken.map((b, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => oeffnen(b)}
                    title={`${b.titel} · ${b.unter}`}
                    className="druckbar absolute flex h-[2.45rem] min-w-1.5 flex-col justify-center overflow-hidden rounded-xl px-2.5 text-left text-grund"
                    style={{
                      top: `${0.4 + b.spur * 2.85}rem`,
                      left: `${b.links * 100}%`,
                      width: `${b.breite * 100}%`,
                      background: BALKEN[b.farbe],
                    }}
                  >
                    <span className="truncate text-[0.7rem] font-semibold">{b.titel}</span>
                    <span className="zahl truncate text-[0.58rem] opacity-75">{b.unter}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div
            className="grid border-t border-linie pt-1.5"
            style={{ gridTemplateColumns: `${LABEL_BREITE} minmax(0,1fr)` }}
          >
            <span />
            <div className="relative h-4">
              {fenster.achse.map((a) => (
                <span
                  key={a.text + a.lage}
                  className={cn(
                    "zahl absolute text-[0.62rem] whitespace-nowrap text-grau",
                    ansicht !== "monat" && a.lage > 0 && a.lage < 1 && "-translate-x-1/2",
                    ansicht === "tag" && a.lage >= 1 && "-translate-x-full",
                  )}
                  style={{ left: `${a.lage * 100}%` }}
                >
                  {a.text}
                </span>
              ))}
            </div>
          </div>
          {zeilen.every((z) => z.balken.length === 0) && (
            <p className="pt-3 text-center text-[0.72rem] text-grau">
              Nichts geplant. Termine, Aufgaben mit Zeitblock und Sprint-Punkte erscheinen hier.
            </p>
          )}
        </div>
      </div>
    </Karte>
  );
}

function Sprintformular({
  punkt,
  tag,
  schliessen,
}: {
  punkt: Sprintpunkt | null;
  tag: Date;
  schliessen: () => void;
}) {
  const { bereiche, sprintpunktSpeichern, sprintpunktLoeschen, bereichHinzufuegen } = useCockpit();
  const t = tagIso(tag);
  const [bereich, setBereich] = useState(punkt?.bereich ?? bereiche[0] ?? "Ankauf");
  const [neuerBereich, setNeuerBereich] = useState("");
  const [titel, setTitel] = useState(punkt?.titel ?? "");
  const [von, setVon] = useState(punkt?.von ?? `${t}T09:00`);
  const [bis, setBis] = useState(punkt?.bis ?? `${t}T10:00`);
  const fehler = !titel.trim()
    ? "Titel fehlt."
    : !(new Date(bis) > new Date(von))
      ? "Ende muss nach dem Beginn liegen."
      : null;

  function speichern(e: React.FormEvent) {
    e.preventDefault();
    if (fehler) return;
    const b = bereich === "__neu" ? neuerBereich.trim() : bereich;
    if (!b) return;
    if (bereich === "__neu") bereichHinzufuegen(b);
    sprintpunktSpeichern({ id: punkt?.id, bereich: b, titel: titel.trim(), von, bis });
    schliessen();
  }

  return (
    <form
      onSubmit={speichern}
      className="mx-5 mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-linie bg-flaeche-hoch p-3 md:mx-6"
    >
      <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
        <span className="mini-label">Bereich</span>
        <select value={bereich} onChange={(e) => setBereich(e.target.value)} className={feld}>
          {bereiche.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          <option value="__neu">+ neuer Bereich …</option>
        </select>
      </label>
      {bereich === "__neu" && (
        <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
          <span className="mini-label">Neuer Bereich</span>
          <input
            value={neuerBereich}
            onChange={(e) => setNeuerBereich(e.target.value)}
            className={feld}
          />
        </label>
      )}
      <label className="flex min-w-[10rem] flex-[2] flex-col gap-1">
        <span className="mini-label">Titel</span>
        <input
          autoFocus
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          className={feld}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="mini-label">Von</span>
        <input
          type="datetime-local"
          value={von}
          onChange={(e) => setVon(e.target.value)}
          className={cn(feld, "zahl")}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="mini-label">Bis</span>
        <input
          type="datetime-local"
          value={bis}
          onChange={(e) => setBis(e.target.value)}
          className={cn(feld, "zahl")}
        />
      </label>
      <div className="flex items-center gap-2">
        {punkt && (
          <button
            type="button"
            onClick={() => {
              sprintpunktLoeschen(punkt.id);
              schliessen();
            }}
            className="druckbar rounded-full px-3 py-1.5 text-[0.66rem] text-grau hover:text-[#9A2727]"
          >
            Löschen
          </button>
        )}
        <button
          type="button"
          onClick={schliessen}
          className="druckbar rounded-full px-3 py-1.5 text-[0.66rem] text-grau hover:text-tinte"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!!fehler}
          title={fehler ?? undefined}
          className="druckbar rounded-full bg-tinte px-3.5 py-1.5 text-[0.66rem] font-semibold text-grund disabled:opacity-30"
        >
          Speichern
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Gedanken-Eingang                                                     */
/* ------------------------------------------------------------------ */

function Gedankeneingang() {
  const { gedanken, gedankeErfassen, gedankeSortieren, gedankeZuruecknehmen } = useCockpit();
  const { anlegen } = useAufgaben();
  const { todoAnlegen } = useBackoffice();
  const [text, setText] = useState("");
  const sichtbar = sichtbareGedanken(gedanken);
  const offen = gedanken.filter((g) => !g.ziel).length;

  function rein() {
    if (!text.trim()) return;
    gedankeErfassen(text);
    setText("");
  }

  function sortieren(g: Gedanke, ziel: keyof typeof GEDANKENZIELE) {
    if (ziel === "aufgabe") {
      const a = anlegen({
        titel: g.text,
        beschreibung: "Aus dem Gedanken-Eingang",
        objektId: null,
        art: "sonst",
        dringlichkeit: "normal",
        faelligAm: null,
        zustaendig: "gf",
      });
      gedankeSortieren(g.id, ziel, a.id);
    } else if (ziel === "backoffice") {
      const k = todoAnlegen(g.text);
      gedankeSortieren(g.id, ziel, k.id);
    } else gedankeSortieren(g.id, ziel);
  }

  return (
    <Karte titel="Gedanken-Eingang" zusatz={`${offen} unsortiert`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          rein();
        }}
        className="flex gap-2 px-5 pb-3 md:px-6"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Einfach reinschreiben, Enter drücken"
          aria-label="Neuer Gedanke"
          className={feld}
        />
        <button
          type="submit"
          className="druckbar shrink-0 rounded-full bg-tinte px-3.5 text-[0.66rem] font-semibold text-grund"
        >
          Rein damit
        </button>
      </form>
      <ul className="divide-y divide-linie border-t border-linie">
        {sichtbar.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5 md:px-6">
            <span className="min-w-0 flex-[1_1_12rem]">
              <span
                className={cn(
                  "block truncate text-[0.8rem]",
                  g.ziel ? "text-grau line-through" : "text-tinte",
                )}
              >
                {g.text}
              </span>
              <span className="zahl mt-0.5 block text-[0.64rem] text-grau">
                {f.datumZeit(g.angelegtAm)}
              </span>
            </span>
            {g.ziel ? (
              <>
                <Plakette ton={g.ziel === "verworfen" ? "grau" : "gruen"}>
                  {GEDANKENZIELE[g.ziel]}
                </Plakette>
                {(g.ziel === "idee" || g.ziel === "verworfen") && (
                  <button
                    type="button"
                    onClick={() => gedankeZuruecknehmen(g.id)}
                    className="druckbar text-[0.62rem] text-grau hover:text-tinte"
                  >
                    zurück
                  </button>
                )}
              </>
            ) : (
              <span className="flex flex-wrap gap-1">
                <button type="button" className={pille} onClick={() => sortieren(g, "aufgabe")}>
                  → Aufgabe
                </button>
                <button type="button" className={pille} onClick={() => sortieren(g, "backoffice")}>
                  → Backoffice
                </button>
                <button type="button" className={pille} onClick={() => sortieren(g, "idee")}>
                  → Ideen
                </button>
                <button
                  type="button"
                  className={pille}
                  aria-label="Verwerfen"
                  title="Verwerfen"
                  onClick={() => sortieren(g, "verworfen")}
                >
                  <X size={11} strokeWidth={2.25} />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="border-t border-linie px-5 py-2.5 text-[0.64rem] text-grau md:px-6">
        „→ Ideen“ landet im Reiter Persönlich. Vom Handy (Teilen, Sprachnotiz, Mail „Gedanke:“)
        folgt mit Phase 2.
      </p>
    </Karte>
  );
}

/* ------------------------------------------------------------------ */
/* Entscheidungen                                                       */
/* ------------------------------------------------------------------ */

function Entscheidungen() {
  const { fragen, frageBeantworten } = useCockpit();
  const { eingaenge, suchprofil, sichten } = useEingang();
  const { objekte } = useObjekte();
  const uebernehmen = useAngebotUebernehmen();
  const [arbeitet, setArbeitet] = useState<string | null>(null);
  const heute = tagIso(new Date());

  const sichtbareFragen = fragen.filter(
    (x) => !x.antwort || (x.beantwortetAm && tagIso(new Date(x.beantwortetAm)) === heute),
  );
  const treffer = eingaenge
    .filter((e) => e.status === "offen" && profilAbweichungen(e, suchprofil).length === 0)
    .sort((a, b) => b.eingangAm.localeCompare(a.eingangAm));
  const offen = sichtbareFragen.filter((x) => !x.antwort).length + treffer.length;

  async function interessant(e: Angebotseingang) {
    setArbeitet(e.id);
    try {
      await uebernehmen(e);
    } finally {
      setArbeitet(null);
    }
  }

  const leer = sichtbareFragen.length === 0 && treffer.length === 0;

  return (
    <Karte titel="Entscheidungen" zusatz={`${offen} offen`}>
      {leer ? (
        <p className="mx-5 mb-4 rounded-xl border border-dashed border-linie-stark px-4 py-6 text-center text-[0.74rem] text-grau md:mx-6">
          Keine Fragen vom Backoffice, keine Profil-Treffer im Eingang.
        </p>
      ) : (
        <ul className="divide-y divide-linie border-t border-linie">
          {sichtbareFragen.map((x) => (
            <Fragezeile
              key={x.id}
              frage={x}
              objekt={objekte.find((o) => o.id === x.objektId) ?? null}
              antworten={(a) => frageBeantworten(x.id, a)}
            />
          ))}
          {treffer.slice(0, 5).map((e) => (
            <li key={e.id} className="flex flex-wrap items-start gap-2 px-5 py-2.5 md:px-6">
              <Plakette ton="dunkel">Ankauf</Plakette>
              <span className="min-w-0 flex-[1_1_14rem]">
                <span className="block text-[0.8rem] leading-snug text-tinte">
                  {e.strasse}
                  {e.stadt ? `, ${e.stadt}` : ""}
                  {e.objektart ? ` · ${OBJEKTARTEN[e.objektart]}` : ""}
                  {e.preis ? ` · ${f.eurKurz(e.preis)}` : ""}
                  {e.preis && e.flaeche
                    ? ` (${Math.round(e.preis / e.flaeche).toLocaleString("de-DE")} €/m²)`
                    : ""}
                </span>
                <span className="mt-0.5 block truncate text-[0.64rem] text-grau">
                  Eingang · im Suchprofil · {e.absender ?? EINGANGSQUELLEN[e.quelle]} ·{" "}
                  {f.datum(e.eingangAm)}
                </span>
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  disabled={arbeitet === e.id}
                  onClick={() => void interessant(e)}
                  className="druckbar rounded-full bg-[#17935C] px-2.5 py-1 text-[0.64rem] font-semibold text-white disabled:opacity-40"
                >
                  Interessant
                </button>
                <button
                  type="button"
                  className={pille}
                  onClick={() => sichten(e.id, "aussortiert", { grund: null })}
                >
                  Aussortieren
                </button>
              </span>
            </li>
          ))}
          {treffer.length > 5 && (
            <li className="px-5 py-2 text-[0.68rem] md:px-6">
              <Link to="/ankauf" className="text-grau-stark hover:text-tinte">
                {treffer.length - 5} weitere Treffer im Eingang
              </Link>
            </li>
          )}
        </ul>
      )}
    </Karte>
  );
}

function Fragezeile({
  frage: x,
  objekt,
  antworten,
}: {
  frage: Frage;
  objekt: Objekt | null;
  antworten: (a: string | null) => void;
}) {
  const freigabe = x.antworten[0] === "Freigeben";
  return (
    <li className="flex flex-wrap items-start gap-2 px-5 py-2.5 md:px-6">
      <Plakette ton={freigabe ? "blau" : "gelb"}>{freigabe ? "Freigabe" : "Frage"}</Plakette>
      <span className="min-w-0 flex-[1_1_14rem]">
        <span className="block text-[0.8rem] leading-snug text-tinte">{x.text}</span>
        <span className="mt-0.5 block truncate text-[0.64rem] text-grau">
          vom Backoffice
          {x.bezug ? ` · ${x.bezug.titel}` : ""}
          {objekt ? ` · ${objekt.kuerzel ?? objekt.strasse}` : ""}
        </span>
      </span>
      {x.antwort ? (
        <span className="flex items-center gap-2">
          <Plakette ton="gruen">✓ {x.antwort}</Plakette>
          <button
            type="button"
            onClick={() => antworten(null)}
            className="druckbar text-[0.62rem] text-grau hover:text-tinte"
          >
            ändern
          </button>
        </span>
      ) : (
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => antworten(x.antworten[0])}
            className="druckbar rounded-full bg-[#17935C] px-2.5 py-1 text-[0.64rem] font-semibold text-white"
          >
            {x.antworten[0]}
          </button>
          <button type="button" className={pille} onClick={() => antworten(x.antworten[1])}>
            {x.antworten[1]}
          </button>
        </span>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Heute auf dem Tisch                                                  */
/* ------------------------------------------------------------------ */

const TERMINARTEN = new Set(["besichtigung", "termin"]);

interface Tischzeile {
  schluessel: string;
  typ: string;
  ton: Ton;
  titel: string;
  unter: string;
  wahl: Tischwahl | null;
  link: { to: string; search?: Record<string, string> } | null;
  setzen: (w: Tischwahl) => void;
}

function Tisch() {
  const { aufgaben, aendern: aufgabeAendern } = useAufgaben();
  const { karten, aendern: karteAendern, todoAnlegen } = useBackoffice();
  const { eingaenge, suchprofil } = useEingang();
  const { objekte } = useObjekte();
  const { tisch, tischSetzen } = useCockpit();
  const heute = new Date();
  const heuteIso = tagIso(heute);

  const zeilen: Tischzeile[] = [];
  const objekt = (id: string | null) => (id ? objekte.find((o) => o.id === id) : undefined);

  // Andere Quellen haben kein eigenes Feld: „Backoffice“ legt dort eine Karte an.
  const anBackoffice =
    (schluessel: string, titel: string, objektId: string | null) => (w: Tischwahl) => {
      if (w === "backoffice" && vermerkGilt(tisch[schluessel], heute) !== "backoffice") {
        const k = todoAnlegen(titel);
        if (objektId) karteAendern(k.id, { objektId });
      }
      tischSetzen(schluessel, w);
    };

  // Aufgaben: fällig bis heute und bei der Geschäftsführung — oder heute schon entschieden.
  for (const a of aufgaben) {
    if (a.erledigtAm || TERMINARTEN.has(a.art)) continue;
    const s = `aufgabe:${a.id}`;
    const v = tisch[s];
    const heuteEntschieden = v?.am === heuteIso;
    const t = tageBis(a.faelligAm);
    const faellig = t !== null && t <= 0 && (a.zustaendig ?? "gf") === "gf";
    if (!faellig && !heuteEntschieden) continue;
    const o = objekt(a.objektId);
    zeilen.push({
      schluessel: s,
      typ: "Aufgabe",
      ton: t !== null && t < 0 ? "rot" : "grau",
      titel: a.titel,
      unter: [o ? objektName(o) : null, fristText(a.faelligAm)].filter(Boolean).join(" · "),
      wahl: vermerkGilt(v, heute),
      link: o ? objektZiel(o) : { to: "/aufgaben" },
      setzen: (w) => {
        if (w === "backoffice") aufgabeAendern(a.id, { zustaendig: "backoffice" });
        if (w === "ich") aufgabeAendern(a.id, { zustaendig: "gf" });
        if (w === "spaeter" && vermerkGilt(v, heute) !== "spaeter") {
          const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
          aufgabeAendern(a.id, { faelligAm: new Date(morgen).toISOString() });
        }
        tischSetzen(s, w);
      },
    });
  }

  // Ankauf-Eingang: eine Zeile je Tag.
  const offenImEingang = eingaenge.filter((e) => e.status === "offen");
  if (offenImEingang.length) {
    const imProfil = offenImEingang.filter(
      (e) => profilAbweichungen(e, suchprofil).length === 0,
    ).length;
    const s = `eingang:${heuteIso}`;
    const titel = `${offenImEingang.length} ${offenImEingang.length === 1 ? "Angebot" : "Angebote"} im Ankauf-Eingang, ${imProfil} im Suchprofil`;
    zeilen.push({
      schluessel: s,
      typ: "Eingang",
      ton: "dunkel",
      titel,
      unter: "Ankauf-Eingang sichten",
      wahl: vermerkGilt(tisch[s], heute),
      link: { to: "/ankauf" },
      setzen: anBackoffice(s, `Ankauf-Eingang sichten (${titel})`, null),
    });
  }

  // Übergaben, die seit 2 Tagen hängen.
  for (const k of karten.filter((x) => haengtFest(x))) {
    const s = `karte:${k.id}`;
    zeilen.push({
      schluessel: s,
      typ: "Übergabe",
      ton: "gelb",
      titel: `${k.titel} nicht bestätigt`,
      unter: `${WEITERLEITUNGEN.find((w) => w.id === k.uebergabe?.ziel)?.titel ?? "Übergabe"} · seit ${f.datum(k.uebergabe?.geaendertAm ?? k.uebergabe?.am ?? k.eingangAm)}`,
      wahl: vermerkGilt(tisch[s], heute) ?? (k.zustaendig === "gf" ? "ich" : null),
      link: { to: "/backoffice", search: { karte: k.id } },
      setzen: (w) => {
        if (w !== "spaeter") karteAendern(k.id, { zustaendig: w === "ich" ? "gf" : "backoffice" });
        tischSetzen(s, w);
      },
    });
  }

  // Offene Nachberechnungen je Objekt.
  for (const o of offeneKaeuferanteile(objekte).objekte) {
    const s = `nachberechnung:${o.id}`;
    const summe = offeneKaeuferanteile([o]).summe;
    zeilen.push({
      schluessel: s,
      typ: "Nachber.",
      ton: "gelb",
      titel: `${objektName(o)}: Käuferanteile offen`,
      unter: summe.toLocaleString("de-DE", { style: "currency", currency: "EUR" }),
      wahl: vermerkGilt(tisch[s], heute),
      link: objektZiel(o),
      setzen: anBackoffice(s, `Nachberechnung ${objektName(o)} nachfassen`, o.id),
    });
  }

  // Ummeldungen ohne Bewegung seit 14 Tagen.
  for (const o of objekte) {
    const faellig = ueberfaelligeUmmeldungen(o);
    if (!faellig.length) continue;
    const s = `ummeldung:${o.id}`;
    zeilen.push({
      schluessel: s,
      typ: "Ummeldung",
      ton: "gelb",
      titel: `${objektName(o)}: ${faellig.length} überfällig`,
      unter: faellig
        .map((u) => UMMELDEARTEN.find((a) => a.art === u.art)?.titel ?? u.art)
        .join(", "),
      wahl: vermerkGilt(tisch[s], heute),
      link: objektZiel(o),
      setzen: anBackoffice(s, `Ummeldungen ${objektName(o)} nachfassen`, o.id),
    });
  }

  const sichtbar = zeilen.filter((z) => zeileSichtbar(tisch[z.schluessel], heute));
  const zahl = (w: Tischwahl | null) => sichtbar.filter((z) => z.wahl === w).length;

  return (
    <Karte
      titel="Heute auf dem Tisch"
      zusatz={`${zahl("ich")} bei mir · ${zahl("backoffice")} Backoffice · ${zahl(null)} offen`}
    >
      {sichtbar.length === 0 ? (
        <p className="mx-5 mb-4 rounded-xl border border-dashed border-linie-stark px-4 py-6 text-center text-[0.74rem] text-grau md:mx-6">
          Nichts fällig. Der Tisch ist leer.
        </p>
      ) : (
        <ul className="divide-y divide-linie border-t border-linie">
          {sichtbar.map((z) => {
            const weg = z.wahl === "backoffice" || z.wahl === "spaeter";
            return (
              <li
                key={z.schluessel}
                className="flex flex-wrap items-center gap-2 px-5 py-2.5 md:px-6"
              >
                <Plakette ton={z.ton} className="min-w-[4.6rem] text-center">
                  {z.typ}
                </Plakette>
                <span className="min-w-0 flex-[1_1_12rem]">
                  {z.link ? (
                    <Link
                      to={z.link.to}
                      search={z.link.search}
                      className={cn(
                        "block truncate text-[0.8rem] hover:underline",
                        weg ? "text-grau line-through" : "text-tinte",
                      )}
                    >
                      {z.titel}
                    </Link>
                  ) : (
                    <span className="block truncate text-[0.8rem] text-tinte">{z.titel}</span>
                  )}
                  <span className="mt-0.5 block truncate text-[0.64rem] text-grau">{z.unter}</span>
                </span>
                <span className="flex gap-1">
                  {(
                    [
                      ["ich", "mache ich"],
                      ["backoffice", "Backoffice"],
                      ["spaeter", "später"],
                    ] as const
                  ).map(([w, t]) => (
                    <button
                      key={w}
                      type="button"
                      aria-pressed={z.wahl === w}
                      onClick={() => z.wahl !== w && z.setzen(w)}
                      className={cn(pille, z.wahl === w && pilleAn)}
                    >
                      {t}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Karte>
  );
}

/* ------------------------------------------------------------------ */
/* Kalender heute                                                       */
/* ------------------------------------------------------------------ */

function KalenderHeute() {
  const { aufgaben } = useAufgaben();
  const { objekte } = useObjekte();
  const [formular, setFormular] = useState(false);
  const heute = tagIso(new Date());

  const termine = aufgaben
    .filter(
      (a) =>
        !a.erledigtAm &&
        TERMINARTEN.has(a.art) &&
        a.faelligAm &&
        tagIso(new Date(a.faelligAm)) === heute,
    )
    .sort((a, b) => (a.zeitblock?.von ?? "").localeCompare(b.zeitblock?.von ?? ""));

  return (
    <Karte
      titel="Kalender heute"
      aktion={
        <button
          type="button"
          onClick={() => setFormular((x) => !x)}
          aria-expanded={formular}
          className="druckbar flex items-center gap-1 rounded-full bg-tinte px-3 py-1.5 text-[0.66rem] font-semibold text-grund"
        >
          <Plus size={12} strokeWidth={2.25} />
          Termin
        </button>
      }
    >
      {formular && <Terminformular schliessen={() => setFormular(false)} />}
      {termine.length === 0 ? (
        <p className="mx-5 mb-3 rounded-xl border border-dashed border-linie-stark px-4 py-6 text-center text-[0.74rem] text-grau md:mx-6">
          Heute keine Termine in der Plattform.
        </p>
      ) : (
        <ul className="divide-y divide-linie border-t border-linie">
          {termine.map((a) => (
            <Terminzeile
              key={a.id}
              aufgabe={a}
              objekt={objekte.find((o) => o.id === a.objektId) ?? null}
            />
          ))}
        </ul>
      )}
      <div className="border-t border-linie px-5 py-2.5 md:px-6">
        <Link
          to="/kalender"
          className="druckbar inline-flex items-center gap-1.5 text-[0.66rem] text-grau-stark hover:text-tinte"
        >
          <CalendarDays size={12} />
          Google Kalender ansehen
        </Link>
      </div>
    </Karte>
  );
}

function Terminzeile({ aufgabe: a, objekt }: { aufgabe: Aufgabe; objekt: Objekt | null }) {
  const farbe = objekt?.stufe === "angekauft" ? BALKEN.dunkel : objekt ? BALKEN.gold : BALKEN.grau;
  return (
    <li className="flex items-center gap-3 px-5 py-2.5 md:px-6">
      <span className="zahl w-11 shrink-0 text-[0.78rem] font-semibold text-tinte">
        {a.zeitblock?.von ?? "ganzt."}
      </span>
      <span
        aria-hidden
        className="w-[3px] self-stretch rounded-full"
        style={{ background: farbe }}
      />
      <span className="min-w-0 flex-1">
        {objekt ? (
          <Link
            {...objektZiel(objekt)}
            className="block truncate text-[0.8rem] text-tinte hover:underline"
          >
            {a.titel}
          </Link>
        ) : (
          <span className="block truncate text-[0.8rem] text-tinte">{a.titel}</span>
        )}
        <span className="mt-0.5 block truncate text-[0.64rem] text-grau">
          {[a.zeitblock ? `bis ${a.zeitblock.bis}` : null, objekt ? objektName(objekt) : null]
            .filter(Boolean)
            .join(" · ") || "ohne Objekt"}
        </span>
      </span>
    </li>
  );
}

/**
 * „+ Termin“: speichert in der Plattform (Aufgabe der Art Termin mit
 * Zeitblock), schreibt bei gewähltem Objekt in dessen Verlauf und öffnet
 * Google Kalender vorausgefüllt. Phase 2: direkt in Google.
 */
function Terminformular({ schliessen }: { schliessen: () => void }) {
  const { anlegen } = useAufgaben();
  const { objekte, aktivitaetEintragen } = useObjekte();
  const [datum, setDatum] = useState(tagIso(new Date()));
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [titel, setTitel] = useState("");
  const [objektId, setObjektId] = useState("");
  const auswahl = useMemo(
    () =>
      [...objekte]
        .filter((o) => o.stufe !== "abgesagt")
        .sort((a, b) => objektName(a).localeCompare(objektName(b), "de")),
    [objekte],
  );

  const tag = new Date(`${datum}T00:00`);
  const start = von ? uhrzeitAm(tag, von) : null;
  const ende = bis ? uhrzeitAm(tag, bis) : start ? new Date(start.getTime() + 3_600_000) : null;
  const fehler = !titel.trim()
    ? "Titel fehlt."
    : !start || !ende
      ? "Uhrzeit fehlt."
      : ende <= start
        ? "Ende muss nach dem Beginn liegen."
        : null;

  function speichern(e: React.FormEvent) {
    e.preventDefault();
    if (fehler || !start || !ende) return;
    const o = objekte.find((x) => x.id === objektId) ?? null;
    const voll = `${o?.kuerzel ? `[${o.kuerzel}] ` : ""}${titel.trim()}`;
    const ort = o ? `${o.strasse}, ${o.plz} ${o.stadt}` : null;
    const zeitblock = {
      von: start.toTimeString().slice(0, 5),
      bis: ende.toTimeString().slice(0, 5),
    };
    anlegen({
      titel: voll,
      beschreibung: null,
      objektId: o?.id ?? null,
      art: "termin",
      dringlichkeit: "normal",
      faelligAm: new Date(datum).toISOString(),
      zeitblock,
      zustaendig: "gf",
    });
    if (o) {
      const termin = { art: titel.trim(), datum, uhrzeit: zeitblock.von, ort };
      aktivitaetEintragen(o.id, {
        art: "termin",
        text: terminText(termin),
        termin,
        quelle: "hand",
      });
    }
    window.open(
      googleTerminAdresse({ titel: voll, start, ende, ort, details: "Angelegt im Revest-Cockpit" }),
      "_blank",
      "noopener",
    );
    schliessen();
  }

  return (
    <form
      onSubmit={speichern}
      className="mx-5 mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-linie bg-flaeche-hoch p-3 md:mx-6"
    >
      <label className="flex flex-col gap-1">
        <span className="mini-label">Tag</span>
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className={cn(feld, "zahl")}
        />
      </label>
      <label className="flex w-[5.5rem] flex-col gap-1">
        <span className="mini-label">Von</span>
        <input
          type="time"
          value={von}
          onChange={(e) => setVon(e.target.value)}
          className={cn(feld, "zahl")}
        />
      </label>
      <label className="flex w-[5.5rem] flex-col gap-1">
        <span className="mini-label">Bis</span>
        <input
          type="time"
          value={bis}
          onChange={(e) => setBis(e.target.value)}
          className={cn(feld, "zahl")}
        />
      </label>
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
        <span className="mini-label">Titel</span>
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="z. B. Besichtigung"
          className={feld}
        />
      </label>
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
        <span className="mini-label">Objekt</span>
        <select value={objektId} onChange={(e) => setObjektId(e.target.value)} className={feld}>
          <option value="">ohne Objekt</option>
          {auswahl.map((o) => (
            <option key={o.id} value={o.id}>
              {objektName(o)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex w-full items-center justify-end gap-2">
        {fehler && <span className="mr-auto text-[0.64rem] text-grau">{fehler}</span>}
        <button
          type="button"
          onClick={schliessen}
          className="druckbar rounded-full px-3 py-1.5 text-[0.66rem] text-grau hover:text-tinte"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!!fehler}
          className="druckbar rounded-full bg-[#17935C] px-3.5 py-1.5 text-[0.66rem] font-semibold text-white disabled:opacity-30"
        >
          Speichern und in Google eintragen
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Postfächer                                                           */
/* ------------------------------------------------------------------ */

const POSTFAECHER = [
  { adresse: "ankauf@revest-projekt.de", zweck: "Angebote → Ankauf-Eingang" },
  { adresse: "info@revest-projekt.de", zweck: "Allgemein → Backoffice" },
  { adresse: "timo.birk@revest-projekt.de", zweck: "Persönlich, vorsortiert nach zuständig" },
];

function Postfaecher() {
  return (
    <Karte titel="Postfächer vorsortiert">
      <ul className="divide-y divide-linie border-t border-linie">
        {POSTFAECHER.map((p) => (
          <li key={p.adresse} className="flex items-start gap-2 px-5 py-2.5 md:px-6">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8rem] text-tinte">{p.adresse}</span>
              <span className="mt-0.5 block text-[0.64rem] text-grau">{p.zweck}</span>
            </span>
            <Plakette ton="grau">Anbindung folgt</Plakette>
          </li>
        ))}
      </ul>
      <p className="border-t border-linie px-5 py-2.5 text-[0.64rem] text-grau md:px-6">
        Mit Phase 2 sortiert die KI jede Mail vor (Kategorie, Objekt, Aktion, zuständig). Sie
        schlägt nur vor, sendet und löscht nie.
      </p>
    </Karte>
  );
}
