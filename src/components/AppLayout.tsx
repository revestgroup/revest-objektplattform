import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "../lib/auth";
import { cn } from "../lib/utils";

/**
 * Die Reihenfolge ist der Arbeitsweg: in der Übersicht sehen, was ansteht, im
 * Ankauf prüfen, als Projekt bauen. Aufgaben liegen daneben, weil sie zu jeder
 * Stufe gehören.
 *
 * `kurz` ist die Beschriftung in der Unterleiste — dort zählt jeder Buchstabe.
 * `unten` entscheidet, ob der Punkt auf dem Telefon in die Leiste kommt: fünf
 * sind das Maximum, bei dem ein Ziel auf 375px noch breiter als ein Daumen
 * ist. Die Karte ist nicht dabei, weil sie als Kachel in der Übersicht liegt —
 * sie beantwortet nur „wo?“, und das ist selten die erste Frage des Tages.
 */
const NAVIGATION = [
  { zu: "/dashboard", titel: "Übersicht", kurz: "Start", icon: LayoutDashboard, unten: true },
  { zu: "/ankauf", titel: "Ankauf", kurz: "Ankauf", icon: Search, unten: true },
  { zu: "/projekte", titel: "Projekte", kurz: "Projekte", icon: Building2, unten: true },
  { zu: "/aufgaben", titel: "To Do's", kurz: "To Do's", icon: ListChecks, unten: true },
  { zu: "/mietverwaltung", titel: "Mietverwaltung", kurz: "Miete", icon: KeyRound, unten: true },
  { zu: "/karte", titel: "Karte", kurz: "Karte", icon: Map, unten: false },
  { zu: "/auswertung", titel: "Auswertung", kurz: "Zahlen", icon: BarChart3, unten: false },
  { zu: "/einstellungen", titel: "Einstellungen", kurz: "Konto", icon: Settings, unten: false },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  const pfad = useRouterState({ select: (s) => s.location.pathname });
  // Die Karte braucht den ganzen Platz und scrollt selbst nicht.
  const randlos = pfad.startsWith("/karte");

  return (
    <div className="flex h-dvh overflow-hidden bg-grund">
      <Seitenleiste />
      <Kopfzeile />
      <main
        className={cn(
          "relative min-w-0 flex-1 pt-16 pb-14 md:pt-0 md:pb-0",
          randlos ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        {children}
      </main>
      <Unterleiste />
    </div>
  );
}

function Seitenleiste() {
  const { nutzer, abmelden } = useAuth();

  return (
    <aside className="hidden w-[210px] shrink-0 flex-col border-r border-linie bg-flaeche md:flex">
      <div className="flex h-16 items-center border-b border-linie px-5">
        <img
          src={`${import.meta.env.BASE_URL}logo/revest-wortmarke-schwarz.png`}
          alt="REVEST"
          className="h-[26px] w-auto"
          width={160}
          height={26}
        />
      </div>

      <nav className="flex flex-1 flex-col gap-px p-2">
        {NAVIGATION.map(({ zu, titel, icon: Icon }) => (
          <Link
            key={zu}
            to={zu}
            className="druckbar group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.8rem] text-grau-stark data-[status=active]:bg-flaeche-aktiv data-[status=active]:text-tinte"
            activeProps={{ "data-status": "active" }}
            activeOptions={{ exact: false }}
          >
            <Icon size={15} strokeWidth={1.75} className="shrink-0" />
            <span>{titel}</span>
          </Link>
        ))}
      </nav>

      {nutzer && (
        <div className="border-t border-linie p-3">
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-linie-stark text-[0.65rem] font-semibold tracking-wider text-tinte">
              {nutzer.initialen}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.78rem] font-medium text-tinte">{nutzer.name}</div>
              <div className="truncate text-[0.65rem] text-grau">{nutzer.rolle}</div>
            </div>
            <button
              type="button"
              onClick={abmelden}
              aria-label="Abmelden"
              className="druckbar flex size-7 items-center justify-center rounded-full text-grau hover:text-tinte"
            >
              <LogOut size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

/**
 * Mobiler Kopf: Wortmarke mittig, rechts das Konto mit Abmelden-Menü.
 * Auswertung und Einstellungen leben hier statt in der Unterleiste — die
 * bleibt den fünf Arbeitsflächen vorbehalten.
 */
function Kopfzeile() {
  const { nutzer, abmelden } = useAuth();
  const [offen, setOffen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-linie bg-flaeche px-3 pt-[env(safe-area-inset-top)] md:hidden">
      {/* Linker Platzhalter in Knopfbreite, damit die Marke exakt mittig steht. */}
      <div className="size-9" aria-hidden />
      <img
        src={`${import.meta.env.BASE_URL}logo/revest-wortmarke-schwarz.png`}
        alt="REVEST"
        className="h-[34px] w-auto"
        width={209}
        height={34}
      />
      <div className="relative">
        {nutzer ? (
          <button
            type="button"
            onClick={() => setOffen((v) => !v)}
            aria-label="Konto"
            aria-expanded={offen}
            className="druckbar flex size-9 items-center justify-center rounded-full bg-tinte text-[0.65rem] font-semibold tracking-wider text-grund"
          >
            {nutzer.initialen}
          </button>
        ) : (
          <div className="size-9" aria-hidden />
        )}
        {offen && (
          <>
            <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOffen(false)} />
            <div className="eintritt absolute top-11 right-0 z-50 w-52 rounded-xl border border-linie bg-flaeche p-1.5 shadow-schwebe">
              {nutzer && (
                <div className="border-b border-linie px-3 pt-2 pb-2.5">
                  <div className="truncate text-[0.8rem] font-medium text-tinte">{nutzer.name}</div>
                  <div className="truncate text-[0.65rem] text-grau">{nutzer.rolle}</div>
                </div>
              )}
              <Link
                to="/auswertung"
                onClick={() => setOffen(false)}
                className="druckbar mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[0.8rem] text-tinte"
              >
                <BarChart3 size={14} strokeWidth={1.75} />
                Auswertung
              </Link>
              <Link
                to="/einstellungen"
                onClick={() => setOffen(false)}
                className="druckbar flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[0.8rem] text-tinte"
              >
                <Settings size={14} strokeWidth={1.75} />
                Einstellungen
              </Link>
              <button
                type="button"
                onClick={abmelden}
                className="druckbar flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[0.8rem] text-grau-stark"
              >
                <LogOut size={14} strokeWidth={1.75} />
                Abmelden
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

/** Auf dem Telefon wandert die Navigation nach unten — ohne Einstellungen. */
function Unterleiste() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 border-t border-linie bg-flaeche pb-[env(safe-area-inset-bottom)] md:hidden">
      {NAVIGATION.filter(({ unten }) => unten).map(({ zu, kurz, icon: Icon }) => (
        <Link
          key={zu}
          to={zu}
          className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[0.55rem] tracking-wide uppercase text-grau data-[status=active]:text-tinte"
          activeProps={{ "data-status": "active" }}
          activeOptions={{ exact: false }}
        >
          {/* Die aktive Seite bekommt eine Pille statt nur eine Farbe —
              auf dem Telefon ist das aus der Entfernung schneller lesbar. */}
          <span className="druckbar flex h-7 w-11 items-center justify-center rounded-full group-data-[status=active]:bg-flaeche-aktiv">
            <Icon size={16} strokeWidth={1.75} />
          </span>
          {kurz}
        </Link>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Seitenkopf — von allen Unterseiten genutzt                           */
/* ------------------------------------------------------------------ */

export function Seitenkopf({ titel, aktion }: { titel: string; aktion?: ReactNode }) {
  return (
    <header className="border-b border-linie px-4 py-5 sm:px-6 md:px-10 md:py-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="headline min-w-0 text-[1.6rem] md:text-[2.1rem]">{titel}</h1>
        {aktion}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Schublade — Detailansichten und Formulare fahren von rechts herein   */
/* ------------------------------------------------------------------ */

export function Schublade({
  offen,
  schliessen,
  titel,
  children,
}: {
  offen: boolean;
  schliessen: () => void;
  titel: string;
  children: ReactNode;
}) {
  // Erst nach dem Öffnen montieren, damit der Inhalt nicht im Hintergrund lebt.
  const [montiert, setMontiert] = useState(offen);
  const rolle = useRef<HTMLDivElement>(null);

  // Wechselt der Inhalt, ohne dass die Schublade zugeht — vom Anlegen in den
  // neuen Datensatz —, bleibt sonst die alte Scrollhöhe stehen und der neue
  // Inhalt beginnt irgendwo in der Mitte. Der Titel benennt den Inhalt.
  useEffect(() => {
    rolle.current?.scrollTo({ top: 0 });
  }, [titel]);

  useEffect(() => {
    if (offen) {
      setMontiert(true);
      return;
    }
    // Nach der Ausfahrt abräumen — gleiche Dauer wie die Transition.
    const t = setTimeout(() => setMontiert(false), 300);
    return () => clearTimeout(t);
  }, [offen]);

  useEffect(() => {
    if (!offen) return;
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key === "Escape") schliessen();
    };
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, [offen, schliessen]);

  if (!montiert) return null;

  return (
    <>
      <div
        onClick={schliessen}
        aria-hidden
        className={cn(
          // Heller Hintergrund verträgt keinen schwarzen Vorhang — ein
          // getönter Schleier mit etwas Unschärfe reicht völlig.
          "fixed inset-0 z-40 bg-tinte/25 backdrop-blur-[3px] transition-opacity duration-300 ease-out",
          offen ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-label={titel}
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-grund shadow-schwebe",
          // Transform statt Breite: läuft auf der GPU und bleibt unterbrechbar.
          // Vollflächig statt schmale Spalte — bearbeitet wird mit Platz.
          "transition-transform duration-300 ease-drawer",
          offen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="shrink-0 border-b border-linie bg-flaeche">
          <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] md:px-7">
            <button
              type="button"
              onClick={schliessen}
              className="druckbar -ml-1.5 flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2 text-[0.72rem] text-grau-stark"
            >
              <ChevronLeft size={16} strokeWidth={2} />
              Zurück
            </button>
            <div className="mini-label min-w-0 flex-1 truncate text-right md:text-center">
              {titel}
            </div>
            <button
              type="button"
              onClick={schliessen}
              aria-label="Schließen"
              className="druckbar hidden size-8 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte md:flex"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div ref={rolle} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </div>
      </div>
    </>
  );
}
