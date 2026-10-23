/**
 * Die Startseite.
 *
 * Oben die Karte — dieselbe wie unter „Karte", nur kleiner: zoomen, schieben
 * und ein Objekt antippen geht hier genauso. Der Knopf oben rechts macht sie
 * groß. Darunter das, was heute zu tun ist: Aufgaben und Termine. Zahlen
 * stehen in der Auswertung, Bereiche in der Menüleiste.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Maximize2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Karte } from "../components/Karte";
import { useAuth } from "../lib/auth";
import { STUFEN, f, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { fristText, sortiereOffen, tageBis, type Aufgabe } from "../lib/aufgaben";
import { useAufgaben } from "../lib/aufgabenStore";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/dashboard")({ component: DashboardSeite });

/** Was im Termin-Block landet statt in der Aufgabenliste. */
const TERMINARTEN = new Set(["besichtigung", "termin"]);

function DashboardSeite() {
  const { objekte, bereit: objekteBereit } = useObjekte();
  const { aufgaben, bereit: aufgabenBereit } = useAufgaben();
  const { nutzer } = useAuth();

  const { offen, termine } = useMemo(() => {
    const alle = aufgaben.filter((a) => !a.erledigtAm).sort(sortiereOffen);
    return {
      offen: alle.filter((a) => !TERMINARTEN.has(a.art)),
      termine: alle.filter((a) => TERMINARTEN.has(a.art) && a.faelligAm),
    };
  }, [aufgaben]);

  if (!objekteBereit || !aufgabenBereit) return <div className="h-96" />;

  return (
    <div className="px-4 py-4 pb-10 sm:px-6 md:px-10 md:py-7">
      <h1 className="headline text-[1.6rem] md:text-[2.1rem]">
        Hallo {nutzer?.name.split(" ")[0] ?? "Timo"}.
      </h1>
      <p className="zahl mt-1.5 text-[0.74rem] text-grau">
        {new Date().toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>

      {/* ----- Karte ----- */}
      <Kartenfeld objekte={objekte} />

      {/* ----- Was heute ansteht ----- */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Block titel="To Do's" zu="/aufgaben" leer="Nichts offen.">
          {offen.slice(0, 6).map((a) => (
            <Aufgabenzeile key={a.id} aufgabe={a} objekte={objekte} />
          ))}
        </Block>

        <Block titel="Termine" zu="/aufgaben" leer="Keine Termine geplant.">
          {termine.slice(0, 6).map((a) => (
            <Terminzeile key={a.id} aufgabe={a} objekte={objekte} />
          ))}
        </Block>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Die kleine Karte. Voll bedienbar — zoomen, schieben, ein Objekt antippen.
 * Der Treffer legt ein schmales Blatt über den unteren Rand, so wie die große
 * Karte es tut; von dort geht es in die Akte oder in die Vollansicht.
 */
function Kartenfeld({ objekte }: { objekte: Objekt[] }) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const objekt = gewaehlt ? (objekte.find((o) => o.id === gewaehlt) ?? null) : null;

  return (
    <section className="relative mt-4 h-[15rem] overflow-hidden rounded-2xl border border-linie bg-flaeche-hoch shadow-karte sm:h-[18rem] md:h-[22rem]">
      <Karte
        objekte={objekte}
        stufen={new Set()}
        stadtteileZeigen={false}
        ansicht="luftbild"
        beschriftung={false}
        gewaehltesObjekt={gewaehlt}
        onObjektWaehlen={setGewaehlt}
        onLeerKlick={() => setGewaehlt(null)}
        onSchweben={() => {}}
        polsterung={18}
      />

      <Link
        to="/karte"
        aria-label="Karte maximieren"
        className="druckbar absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-flaeche text-tinte shadow-hoch"
      >
        <Maximize2 size={15} strokeWidth={2} />
      </Link>

      {objekt && (
        <div className="eintritt absolute inset-x-2 bottom-2 z-10 flex items-center gap-3 rounded-xl border border-linie bg-flaeche/95 px-3.5 py-2.5 shadow-hoch backdrop-blur-sm">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: STUFEN[objekt.stufe].farbe }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.8rem] font-medium text-tinte">
              {objekt.strasse}
            </span>
            <span className="zahl block truncate text-[0.66rem] text-grau">
              {objekt.stadtteil} · {STUFEN[objekt.stufe].titel}
              {objekt.kaufpreis ? ` · ${f.eurKurz(objekt.kaufpreis)}` : ""}
            </span>
          </span>
          <Link
            to={objekt.stufe === "angekauft" ? "/projekte" : "/ankauf"}
            search={{ objekt: objekt.id }}
            className="druckbar flex shrink-0 items-center gap-1 rounded-full bg-tinte px-3 py-1.5 text-[0.62rem] font-semibold tracking-[0.1em] uppercase text-grund"
          >
            Öffnen
            <ArrowRight size={11} strokeWidth={2.25} />
          </Link>
          <button
            type="button"
            onClick={() => setGewaehlt(null)}
            aria-label="Schließen"
            className="druckbar flex size-7 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </section>
  );
}

function Block({
  titel,
  zu,
  leer,
  children,
}: {
  titel: string;
  zu: string;
  leer: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="rounded-2xl border border-linie bg-flaeche p-5 shadow-karte md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          {titel}
        </h2>
        <Link
          to={zu}
          className="druckbar rounded-full px-2.5 py-1 text-[0.68rem] font-medium text-grau-stark hover:text-tinte"
        >
          Alle
        </Link>
      </div>

      {children.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-linie-stark px-4 py-9 text-center text-[0.76rem] text-grau">
          {leer}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-linie">{children}</ul>
      )}
    </section>
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

/**
 * Termine tragen den Tag links als Block. Hier greift später der Terminplaner
 * auf den Kalender zu — die Zeile bleibt dieselbe, nur die Quelle wechselt.
 */
function Terminzeile({ aufgabe, objekte }: { aufgabe: Aufgabe; objekte: Objekt[] }) {
  const tage = tageBis(aufgabe.faelligAm);
  const spaet = tage !== null && tage < 0;
  const objekt = aufgabe.objektId ? objekte.find((o) => o.id === aufgabe.objektId) : undefined;
  const tag = aufgabe.faelligAm ? new Date(aufgabe.faelligAm) : null;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl",
          spaet ? "bg-flaeche-aktiv" : "bg-flaeche-hoch",
        )}
      >
        {tag ? (
          <>
            <span className="zahl text-[0.82rem] leading-none font-semibold text-tinte tabular-nums">
              {tag.getDate()}
            </span>
            <span className="mt-0.5 text-[0.54rem] font-semibold tracking-[0.1em] uppercase text-grau">
              {tag.toLocaleDateString("de-DE", { month: "short" }).replace(".", "")}
            </span>
          </>
        ) : (
          <CalendarDays size={15} strokeWidth={1.8} className="text-grau" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8rem] text-tinte">{aufgabe.titel}</span>
        <span className="mt-0.5 block truncate text-[0.66rem] text-grau">
          {objekt ? objekt.strasse : fristText(aufgabe.faelligAm)}
        </span>
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
