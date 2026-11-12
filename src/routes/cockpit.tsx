/**
 * Das Cockpit — die Startseite (Ausbau 4).
 *
 * Oben der Umschalter „Ich arbeite gerade als …“. Die Geschäftsführung sieht
 * die Reiter Alltag und Persönlich · Visionboard, das Backoffice nur seine
 * eigene Ansicht. Bis Phase 2 gibt es keine echten Rechte, nur die Rolle.
 * Der gewählte Reiter steht in `?reiter=`.
 */
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "../lib/auth";
import { STUFEN, f, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { fristText, sortiereOffen, tageBis, type Aufgabe } from "../lib/aufgaben";
import { useAufgaben } from "../lib/aufgabenStore";
import { KeineId } from "../components/KalenderHinweis";
import { useEinstellungen } from "../lib/einstellungenStore";
import { kalenderAdresse } from "../lib/kalender";
import { UEBERGABESTATUS, WEITERLEITUNGEN, haengtFest, uebergabestatus } from "../lib/backoffice";
import { useBackoffice } from "../lib/backofficeStore";
import { offeneKaeuferanteile } from "../lib/nachberechnung";
import { UMMELDEARTEN, ueberfaelligeUmmeldungen } from "../lib/ummeldungen";
import {
  REITER,
  ROLLEN,
  ROLLEN_REIHENFOLGE,
  gruss,
  reiterFuer,
  reiterWaehlen,
  type Cockpitreiter,
} from "../lib/cockpit";
import { useCockpit } from "../lib/cockpitStore";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/cockpit")({
  validateSearch: (such: Record<string, unknown>): { reiter?: Cockpitreiter } =>
    such.reiter === "alltag" || such.reiter === "persoenlich" || such.reiter === "backoffice"
      ? { reiter: such.reiter }
      : {},
  component: CockpitSeite,
});

function CockpitSeite() {
  const { nutzer } = useAuth();
  const { rolle, rolleSetzen, bereit } = useCockpit();
  const { reiter: gewuenscht } = Route.useSearch();
  const navigate = useNavigate({ from: "/cockpit" });
  const reiter = reiterWaehlen(rolle, gewuenscht);
  const vorname = nutzer?.name.split(" ")[0] ?? "Timo";

  if (!bereit) return <div className="h-96" />;

  const titel =
    rolle === "backoffice"
      ? "Backoffice heute."
      : reiter === "persoenlich"
        ? `Dein Board, ${vorname}.`
        : `${gruss()}, ${vorname}.`;

  return (
    <div className="px-4 py-4 pb-10 sm:px-6 md:px-10 md:py-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mini-label">
            Cockpit ·{" "}
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="headline mt-1.5 text-[1.6rem] md:text-[2.1rem]">{titel}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[0.72rem] text-grau">Ich arbeite gerade als</span>
          <div
            role="group"
            aria-label="Rolle"
            className="flex gap-0.5 rounded-full border border-linie bg-flaeche-hoch p-0.5"
          >
            {ROLLEN_REIHENFOLGE.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={rolle === r}
                onClick={() => {
                  rolleSetzen(r);
                  navigate({ search: {}, replace: true });
                }}
                className={cn(
                  "druckbar rounded-full px-3.5 py-1.5 text-[0.72rem] font-semibold",
                  rolle === r ? "bg-tinte text-grund" : "text-grau-stark hover:text-tinte",
                )}
              >
                {ROLLEN[r].titel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {reiterFuer(rolle).length > 1 && (
        <div role="tablist" className="mt-5 flex gap-1 border-b border-linie">
          {reiterFuer(rolle).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={reiter === r}
              onClick={() => navigate({ search: { reiter: r }, replace: true })}
              className={cn(
                "-mb-px border-b-2 px-3.5 py-2.5 text-[0.7rem] font-semibold tracking-[0.14em] uppercase",
                reiter === r
                  ? "border-tinte text-tinte"
                  : "border-transparent text-grau hover:text-tinte",
              )}
            >
              {REITER[r]}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        {reiter === "alltag" && <Alltag />}
        {reiter === "persoenlich" && <Persoenlich />}
        {reiter === "backoffice" && <BackofficeAnsicht />}
      </div>
    </div>
  );
}

/** Kommt mit P3. Der Hinweis bleibt, bis es eine echte Anmeldung gibt. */
function Persoenlich() {
  return (
    <section className="rounded-2xl border border-linie bg-flaeche p-5 shadow-karte md:p-6">
      <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
        Persönlich · Visionboard
      </h2>
      <p className="mt-4 rounded-xl border border-dashed border-linie-stark px-4 py-9 text-center text-[0.76rem] text-grau">
        Tagesfokus, Visionboard, Ziele und Ideen folgen hier.
      </p>
      <p className="mt-3 text-[0.68rem] text-grau">
        Persönliche Daten liegen nur in diesem Browser.
      </p>
    </section>
  );
}

/** Kommt mit P4: Tagesroutine, Posteingang vorsortiert, Fragen an Timo, Zeit. */
function BackofficeAnsicht() {
  const { karten } = useBackoffice();
  const posteingang = karten.filter((k) => k.spalte === "posteingang").length;
  return (
    <section className="rounded-2xl border border-linie bg-flaeche p-5 shadow-karte md:p-6">
      <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
        Backoffice
      </h2>
      <p className="mt-4 rounded-xl border border-dashed border-linie-stark px-4 py-9 text-center text-[0.76rem] text-grau">
        Tagesroutine, vorsortierter Posteingang und Fragen an Timo folgen hier.
      </p>
      <Link
        to="/backoffice"
        className="druckbar mt-4 inline-flex items-center gap-1.5 rounded-full bg-tinte px-3.5 py-1.5 text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-grund"
      >
        Zum Board{posteingang > 0 ? ` · ${posteingang} im Posteingang` : ""}
        <ArrowRight size={11} strokeWidth={2.25} />
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Alltag — bis P2 die bisherigen Blöcke der Startseite                 */
/* ------------------------------------------------------------------ */

/** Was im Termin-Block landet statt in der Aufgabenliste. */
const TERMINARTEN = new Set(["besichtigung", "termin"]);

function Alltag() {
  const { objekte, bereit: objekteBereit } = useObjekte();
  const { aufgaben, bereit: aufgabenBereit } = useAufgaben();
  const { karten } = useBackoffice();
  // Übergaben, die seit über 2 Tagen nicht bestätigt sind oder fehlschlugen.
  const haengend = karten.filter((k) => haengtFest(k));
  const nachberechnung = useMemo(() => offeneKaeuferanteile(objekte), [objekte]);

  const { offen, termine } = useMemo(() => {
    const alle = aufgaben.filter((a) => !a.erledigtAm).sort(sortiereOffen);
    return {
      offen: alle.filter((a) => !TERMINARTEN.has(a.art)),
      termine: alle.filter((a) => TERMINARTEN.has(a.art) && a.faelligAm),
    };
  }, [aufgaben]);

  // Ummeldungen, an denen seit 14 Tagen nichts passiert ist — je Projekt eine Zeile.
  const ummeldungen = useMemo(
    () =>
      objekte
        .map((o) => ({ objekt: o, faellig: ueberfaelligeUmmeldungen(o) }))
        .filter((x) => x.faellig.length > 0),
    [objekte],
  );

  if (!objekteBereit || !aufgabenBereit) return <div className="h-96" />;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Block titel="To Do's" zu="/aufgaben" leer="Nichts offen.">
          {offen.slice(0, 6).map((a) => (
            <Aufgabenzeile key={a.id} aufgabe={a} objekte={objekte} />
          ))}
        </Block>

        <Termine>
          <Block titel="Termine" zu="/aufgaben" leer="Keine Termine geplant.">
            {termine.slice(0, 6).map((a) => (
              <Terminzeile key={a.id} aufgabe={a} objekte={objekte} />
            ))}
          </Block>
        </Termine>

        {nachberechnung.summe > 0 && (
          <Block titel="Offene Nachberechnungen" zu="/projekte" leer="">
            <li className="py-2 text-[0.78rem] text-grau-stark">
              Käuferanteile noch nicht bezahlt:{" "}
              <span className="zahl font-semibold text-tinte">
                {nachberechnung.summe.toLocaleString("de-DE", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </li>
            {nachberechnung.objekte.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link
                  to="/projekte"
                  search={{ objekt: o.id }}
                  className="druckbar -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 text-[0.8rem] text-tinte"
                >
                  {o.kuerzel ? `${o.kuerzel} · ` : ""}
                  {o.bezeichnung?.trim() || o.strasse}
                </Link>
              </li>
            ))}
          </Block>
        )}

        {haengend.length > 0 && (
          <Block
            titel={`${haengend.length} ${haengend.length === 1 ? "Übergabe" : "Übergaben"} nicht bestätigt`}
            zu="/backoffice"
            leer=""
          >
            {haengend.slice(0, 6).map((k) => {
              const st = UEBERGABESTATUS[uebergabestatus(k.uebergabe!)];
              return (
                <li key={k.id}>
                  <Link
                    to="/backoffice"
                    search={{ karte: k.id }}
                    className="druckbar -mx-2 flex items-center gap-3 rounded-lg px-2 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.82rem] text-tinte">{k.titel}</span>
                      <span className="mt-0.5 block truncate text-[0.68rem] text-grau">
                        {WEITERLEITUNGEN.find((w) => w.id === k.uebergabe!.ziel)?.titel} · seit{" "}
                        {f.datum(k.uebergabe!.geaendertAm ?? k.uebergabe!.am)}
                      </span>
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold"
                      style={{ background: st.weich, color: st.tief }}
                    >
                      {st.titel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </Block>
        )}

        {/* Nur wenn etwas fällig ist — ein leerer Kasten „alles gemeldet“ wäre Lärm. */}
        {ummeldungen.length > 0 && (
          <Block titel="Ummeldungen" zu="/projekte" leer="">
            {ummeldungen.map(({ objekt, faellig }) => (
              <li key={objekt.id}>
                <Link
                  to="/projekte"
                  search={{ objekt: objekt.id }}
                  className="druckbar -mx-2 flex items-center gap-3 rounded-lg px-2 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.82rem] text-tinte">
                      {objekt.kuerzel ? `${objekt.kuerzel} · ` : ""}
                      {objekt.bezeichnung?.trim() || objekt.strasse}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.68rem] text-grau">
                      {faellig
                        .map((u) => {
                          const titel = UMMELDEARTEN.find((a) => a.art === u.art)?.titel ?? u.art;
                          const einheit =
                            u.richtung === "ab"
                              ? objekt.einheiten
                                  .find((e) => e.id === u.einheitId)
                                  ?.bezeichnung.split(" · ")[0]
                              : null;
                          return `${einheit ? `${einheit}: ` : ""}${titel}${u.status === "gemeldet" ? " (Bestätigung fehlt)" : ""}`;
                        })
                        .join(", ")}
                    </span>
                  </span>
                  <span
                    className="zahl shrink-0 text-[0.66rem] font-medium"
                    style={{ color: STUFEN.abgesagt.farbe }}
                  >
                    {faellig.length} überfällig
                  </span>
                </Link>
              </li>
            ))}
          </Block>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Termine: Plattform oder Google Kalender                              */
/* ------------------------------------------------------------------ */

const TERMINQUELLE = "revest.startseite.termine.v1";

/** Umschalter über dem Termin-Block — die Wahl wird im Browser gemerkt. */
function Termine({ children }: { children: React.ReactNode }) {
  const { kalenderId } = useEinstellungen();
  const [quelle, setQuelle] = useState<"plattform" | "google">(() => {
    try {
      return localStorage.getItem(TERMINQUELLE) === "google" ? "google" : "plattform";
    } catch {
      return "plattform";
    }
  });
  const waehlen = (q: "plattform" | "google") => {
    setQuelle(q);
    try {
      localStorage.setItem(TERMINQUELLE, q);
    } catch {
      // egal
    }
  };
  const adresse = kalenderAdresse(kalenderId, "AGENDA");
  return (
    <div className="relative">
      <div className="absolute top-4 right-16 z-10 flex gap-1 rounded-full border border-linie bg-flaeche-hoch p-0.5 md:top-5">
        {(
          [
            ["plattform", "Plattform"],
            ["google", "Google"],
          ] as const
        ).map(([w, t]) => (
          <button
            key={w}
            type="button"
            onClick={() => waehlen(w)}
            aria-pressed={quelle === w}
            className={cn(
              "druckbar rounded-full px-2.5 py-0.5 text-[0.62rem] font-medium",
              quelle === w ? "bg-tinte text-grund" : "text-grau-stark",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {quelle === "plattform" ? (
        children
      ) : (
        <section className="rounded-2xl border border-linie bg-flaeche p-5 shadow-karte md:p-6">
          <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
            Termine
          </h2>
          <div className="mt-4">
            {adresse ? (
              <iframe
                title="Google Kalender, Agenda"
                src={adresse}
                className="h-72 w-full rounded-xl border border-linie"
              />
            ) : (
              <KeineId />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
