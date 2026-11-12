/**
 * Das Cockpit — die Startseite (Ausbau 4).
 *
 * Oben der Umschalter „Ich arbeite gerade als …“. Die Geschäftsführung sieht
 * die Reiter Alltag und Persönlich · Visionboard, das Backoffice nur seine
 * eigene Ansicht. Bis Phase 2 gibt es keine echten Rechte, nur die Rolle.
 * Der gewählte Reiter steht in `?reiter=`.
 */
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CockpitAlltag } from "../components/CockpitAlltag";
import { useAuth } from "../lib/auth";
import { useBackoffice } from "../lib/backofficeStore";
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
        {reiter === "alltag" && <CockpitAlltag />}
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
