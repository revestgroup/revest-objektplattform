/**
 * Formularbausteine.
 *
 * Alle Felder tragen ein gesperrtes Mini-Versal-Label — das ist die Signatur
 * der Marke. Den Radius holen sich Eingaben zentral aus styles.css, damit hier
 * keine Klasse vergessen werden kann. Zahlenfelder zeigen ihre Einheit rechts
 * im Feld, damit nicht jede Beschriftung "in €" heißen muss.
 */
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "../lib/utils";

const RAHMEN =
  "w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte transition-colors duration-150 ease-out placeholder:text-grau focus:border-linie-stark focus:outline-none";

function Raster({ spalten, children }: { spalten: 1 | 2 | 3; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-6",
        spalten === 1 && "grid-cols-1",
        spalten === 2 && "grid-cols-1 sm:grid-cols-2",
        spalten === 3 && "grid-cols-2 sm:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

export function Bereich({
  titel,
  hinweis,
  children,
  spalten = 2,
}: {
  titel: string;
  hinweis?: string;
  children: ReactNode;
  spalten?: 1 | 2 | 3;
}) {
  return (
    // Ohne Trennlinie: die Überschrift in Versalien grenzt den Bereich
    // deutlich genug ab, und bei acht Bereichen untereinander wären acht
    // Striche die auffälligste Gestaltung der Maske.
    <section className="px-6 pt-10 pb-2 first:pt-8 md:px-10">
      <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
        {titel}
      </h2>
      {hinweis && (
        <p className="mt-2.5 max-w-md text-[0.72rem] leading-relaxed text-grau">{hinweis}</p>
      )}
      <div className="mt-7">
        <Raster spalten={spalten}>{children}</Raster>
      </div>
    </section>
  );
}

/**
 * Zugeklappter Bereich für alles, was ein Objekt beschreibt, aber beim Anlegen
 * nicht gebraucht wird. Die Maske soll beim Öffnen nach einem kurzen Formular
 * aussehen — Energieausweis und Eigentümerkontakt kann man nachtragen.
 *
 * Bewusst ohne Höhenanimation: ein Bereich mit Bildfeld und Dokumentenliste hat
 * keine messbare Zielhöhe, und ein ruckelnder Aufklapper ist schlechter als
 * keiner.
 */
export function Klappbereich({
  titel,
  hinweis,
  gefuellt,
  children,
  spalten = 2,
  offenAnfangs,
}: {
  titel: string;
  hinweis?: string;
  /** Anzahl ausgefüllter Felder — sonst sieht man zugeklappt nicht, dass etwas drinsteht. */
  gefuellt?: number;
  children: ReactNode;
  spalten?: 1 | 2 | 3;
  offenAnfangs?: boolean;
}) {
  const [offen, setOffen] = useState(Boolean(offenAnfangs));

  return (
    // Hier bleibt die Linie: sie markiert eine Zeile, die man anfassen kann,
    // und trennt den zugeklappten Teil der Maske vom offenen.
    <section className="mt-10 border-t border-linie px-6 first:mt-0 md:px-10">
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        className="druckbar -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-6 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
            {titel}
          </span>
          {hinweis && (
            <span className="mt-1 block text-[0.68rem] leading-relaxed text-grau">{hinweis}</span>
          )}
        </span>
        {gefuellt ? (
          <span className="zahl shrink-0 rounded-full bg-flaeche-hoch px-2 py-0.5 text-[0.6rem] font-semibold text-grau-stark">
            {gefuellt}
          </span>
        ) : null}
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className={cn(
            "shrink-0 text-grau transition-transform duration-200 ease-out-stark",
            offen && "rotate-180",
          )}
        />
      </button>
      {offen && (
        <div className="eintritt pb-9">
          <Raster spalten={spalten}>{children}</Raster>
        </div>
      )}
    </section>
  );
}

export function Huelle({
  id,
  label,
  pflicht,
  fehler,
  hinweis,
  breit,
  children,
}: {
  id: string;
  label: string;
  pflicht?: boolean;
  fehler?: string;
  hinweis?: string;
  breit?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn(breit && "sm:col-span-2")}>
      <label htmlFor={id} className="mini-label block">
        {label}
        {pflicht && <span className="ml-1 text-grau-stark">*</span>}
      </label>
      <div className="mt-2">{children}</div>
      {/* Hinweis weicht dem Fehler — zwei Zeilen untereinander lenken ab. */}
      {fehler ? (
        <p className="mt-1.5 text-[0.65rem] text-tinte">{fehler}</p>
      ) : hinweis ? (
        <p className="mt-1.5 text-[0.65rem] leading-relaxed text-grau">{hinweis}</p>
      ) : null}
    </div>
  );
}

export function Textfeld({
  id,
  label,
  wert,
  setWert,
  platzhalter,
  pflicht,
  fehler,
  hinweis,
  breit,
  zeilen,
}: {
  id: string;
  label: string;
  wert: string;
  setWert: (v: string) => void;
  platzhalter?: string;
  pflicht?: boolean;
  fehler?: string;
  hinweis?: string;
  breit?: boolean;
  zeilen?: number;
}) {
  return (
    <Huelle id={id} label={label} pflicht={pflicht} fehler={fehler} hinweis={hinweis} breit={breit}>
      {zeilen ? (
        <textarea
          id={id}
          rows={zeilen}
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          placeholder={platzhalter}
          className={cn(RAHMEN, "resize-y leading-relaxed", fehler && "border-grau-stark")}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          placeholder={platzhalter}
          className={cn(RAHMEN, fehler && "border-grau-stark")}
        />
      )}
    </Huelle>
  );
}

export function Zahlfeld({
  id,
  label,
  wert,
  setWert,
  einheit,
  schritt,
  platzhalter,
  pflicht,
  fehler,
  hinweis,
  breit,
}: {
  id: string;
  label: string;
  /** Leerer String heißt "nicht angegeben" — null ist ein gültiger Wert im Modell. */
  wert: string;
  setWert: (v: string) => void;
  einheit?: string;
  schritt?: string;
  platzhalter?: string;
  pflicht?: boolean;
  fehler?: string;
  hinweis?: string;
  breit?: boolean;
}) {
  return (
    <Huelle id={id} label={label} pflicht={pflicht} fehler={fehler} hinweis={hinweis} breit={breit}>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={schritt}
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          placeholder={platzhalter}
          className={cn(
            RAHMEN,
            "zahl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            einheit && "pr-12",
            fehler && "border-grau-stark",
          )}
        />
        {einheit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.68rem] text-grau">
            {einheit}
          </span>
        )}
      </div>
    </Huelle>
  );
}

export function Auswahlfeld<T extends string>({
  id,
  label,
  wert,
  setWert,
  optionen,
  pflicht,
  fehler,
  hinweis,
  breit,
  leerText,
}: {
  id: string;
  label: string;
  wert: T;
  setWert: (v: T) => void;
  optionen: { wert: T; titel: string }[];
  pflicht?: boolean;
  fehler?: string;
  hinweis?: string;
  breit?: boolean;
  /** Erste, leere Option — für optionale Felder. */
  leerText?: string;
}) {
  return (
    <Huelle id={id} label={label} pflicht={pflicht} fehler={fehler} hinweis={hinweis} breit={breit}>
      <select
        id={id}
        value={wert}
        onChange={(e) => setWert(e.target.value as T)}
        className={cn(RAHMEN, fehler && "border-grau-stark")}
      >
        {leerText && <option value="">{leerText}</option>}
        {optionen.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.titel}
          </option>
        ))}
      </select>
    </Huelle>
  );
}

/**
 * Segmentierte Auswahl. Für kurze, feste Listen besser als ein Dropdown:
 * alle Möglichkeiten sind sofort sichtbar, ein Klick genügt.
 */
export function Segmente<T extends string>({
  label,
  wert,
  setWert,
  optionen,
  breit,
  hinweis,
}: {
  label: string;
  wert: T;
  setWert: (v: T) => void;
  optionen: { wert: T; titel: string }[];
  breit?: boolean;
  hinweis?: string;
}) {
  return (
    <div className={cn(breit && "sm:col-span-2")}>
      <span className="mini-label block">{label}</span>
      <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-linie bg-flaeche-hoch p-1">
        {optionen.map((o) => {
          const aktiv = o.wert === wert;
          return (
            <button
              key={o.wert}
              type="button"
              onClick={() => setWert(o.wert)}
              aria-pressed={aktiv}
              className={cn(
                "druckbar flex-1 rounded-lg px-3 py-2 text-[0.7rem] font-medium whitespace-nowrap",
                aktiv
                  ? "bg-tinte text-grund shadow-karte hover:bg-tinte"
                  : "bg-transparent text-grau-stark",
              )}
            >
              {o.titel}
            </button>
          );
        })}
      </div>
      {hinweis && <p className="mt-1.5 text-[0.65rem] leading-relaxed text-grau">{hinweis}</p>}
    </div>
  );
}

/**
 * Kippschalter für Einstellungen.
 *
 * Die ganze Zeile ist der Schalter — am Telefon trifft man so immer, ohne den
 * Knopf selbst zu suchen. Der Knopf bewegt sich per translateX, damit die
 * Bewegung auf der Grafikeinheit läuft und auch unter Last glatt bleibt.
 *
 * `vermerk` steht für Optionen, die heute nur vorgemerkt sind: lieber ein
 * ehrlicher Hinweis als ein Schalter, der stumm nichts tut.
 */
export function Regler({
  titel,
  hinweis,
  vermerk,
  an,
  umschalten,
}: {
  titel: string;
  hinweis?: string;
  vermerk?: string;
  an: boolean;
  umschalten: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={an}
      onClick={umschalten}
      className="druckbar flex w-full items-start gap-4 rounded-xl px-2 py-3 text-left hover:bg-flaeche-hoch"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[0.84rem] font-medium text-tinte">{titel}</span>
          {vermerk && (
            <span className="rounded-full border border-linie-stark px-2 py-0.5 text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-grau">
              {vermerk}
            </span>
          )}
        </span>
        {hinweis && (
          <span className="mt-1 block max-w-prose text-[0.72rem] leading-relaxed text-grau">
            {hinweis}
          </span>
        )}
      </span>

      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-[26px] w-[44px] shrink-0 items-center rounded-full border px-[3px] transition-colors duration-200 ease-out",
          an ? "border-tinte bg-tinte" : "border-linie-stark bg-flaeche-hoch",
        )}
      >
        <span
          className={cn(
            "size-[18px] rounded-full bg-grund shadow-karte transition-transform duration-200 ease-out-stark",
            an ? "translate-x-[18px]" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

export function Schalter({
  label,
  hinweis,
  an,
  setAn,
}: {
  label: string;
  hinweis?: string;
  an: boolean;
  setAn: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={an}
      onClick={() => setAn(!an)}
      className="druckbar flex items-start gap-3 rounded-xl border border-linie bg-flaeche px-3 py-2.5 text-left"
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-150 ease-out",
          an ? "border-tinte bg-tinte" : "border-linie-stark bg-transparent",
        )}
      >
        {an && (
          <svg viewBox="0 0 10 10" className="size-2.5 text-grund" fill="none">
            <path
              d="M1.5 5.2 3.8 7.5 8.5 2.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.78rem] text-tinte">{label}</span>
        {hinweis && (
          <span className="mt-0.5 block text-[0.65rem] leading-relaxed text-grau">{hinweis}</span>
        )}
      </span>
    </button>
  );
}
