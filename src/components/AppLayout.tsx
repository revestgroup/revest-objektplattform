import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  KeyRound,
  LogOut,
  Map,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "../lib/auth";
import { useObjekte } from "../lib/objekteStore";
import { STUFEN } from "../lib/objekte";
import { cn } from "../lib/utils";

/** `kurz` ist die Beschriftung in der Unterleiste — dort zählt jeder Buchstabe. */
const NAVIGATION = [
  { zu: "/karte", titel: "Karte", kurz: "Karte", icon: Map },
  { zu: "/objekte", titel: "Objekte", kurz: "Objekte", icon: Building2 },
  { zu: "/mietverwaltung", titel: "Mietverwaltung", kurz: "Miete", icon: KeyRound },
  { zu: "/leads", titel: "Leads", kurz: "Leads", icon: Users },
  { zu: "/auswertung", titel: "Auswertung", kurz: "Zahlen", icon: BarChart3 },
  { zu: "/einstellungen", titel: "Einstellungen", kurz: "Konto", icon: Settings },
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
          "relative min-w-0 flex-1 pt-14 pb-14 md:pt-0 md:pb-0",
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

      <Bestandsblock />

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
 * Kleine Bilanz am Fuß der Leiste. Steht hier und nicht auf einer eigenen
 * Seite, weil es die eine Zahl ist, die Timo immer sehen will.
 */
function Bestandsblock() {
  const { objekte, bereit } = useObjekte();
  if (!bereit) return <div className="h-[132px]" />;

  const aktiv = objekte.filter((o) => STUFEN[o.stufe].aktiv).length;
  const angekauft = objekte.filter((o) => o.stufe === "angekauft");
  const einheiten = angekauft.reduce((s, o) => s + o.einheiten.length, 0);

  return (
    <div className="border-t border-linie px-5 py-4">
      <div className="mini-label">Bestand</div>
      <dl className="mt-3 space-y-2">
        {[
          ["Aktiv in Prüfung", aktiv],
          ["Angekauft", angekauft.length],
          ["Einheiten", einheiten],
        ].map(([titel, wert]) => (
          <div key={titel as string} className="flex items-baseline justify-between gap-2">
            <dt className="text-[0.7rem] text-grau">{titel}</dt>
            <dd className="zahl text-sm font-semibold text-tinte">{wert}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Mobiler Kopf: Wortmarke mittig, rechts das Konto mit Abmelden-Menü.
 * Einstellungen leben hier statt in der Unterleiste — die bleibt den
 * drei Arbeitsflächen vorbehalten.
 */
function Kopfzeile() {
  const { nutzer, abmelden } = useAuth();
  const [offen, setOffen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-linie bg-flaeche px-3 pt-[env(safe-area-inset-top)] md:hidden">
      {/* Linker Platzhalter in Knopfbreite, damit die Marke exakt mittig steht. */}
      <div className="size-9" aria-hidden />
      <img
        src={`${import.meta.env.BASE_URL}logo/revest-wortmarke-schwarz.png`}
        alt="REVEST"
        className="h-[24px] w-auto"
        width={148}
        height={24}
      />
      <div className="relative">
        {nutzer ? (
          <button
            type="button"
            onClick={() => setOffen((v) => !v)}
            aria-label="Konto"
            aria-expanded={offen}
            className="druckbar flex size-9 items-center justify-center rounded-full border border-linie-stark text-[0.65rem] font-semibold tracking-wider text-tinte"
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
                to="/einstellungen"
                onClick={() => setOffen(false)}
                className="druckbar mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[0.8rem] text-tinte"
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
      {NAVIGATION.filter(({ zu }) => zu !== "/einstellungen").map(({ zu, kurz, icon: Icon }) => (
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

export function Seitenkopf({
  label,
  titel,
  beschreibung,
  aktion,
}: {
  label: string;
  titel: string;
  beschreibung?: string;
  aktion?: ReactNode;
}) {
  return (
    <header className="border-b border-linie px-6 py-7 md:px-10 md:py-9">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <div className="mini-label">{label}</div>
          <h1 className="headline mt-2.5 text-[2rem] md:text-[2.6rem]">{titel}</h1>
          {beschreibung && (
            <p className="mt-3 max-w-xl text-[0.82rem] leading-relaxed text-grau">
              {beschreibung}
            </p>
          )}
        </div>
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </div>
      </div>
    </>
  );
}
