/**
 * Einstellungen.
 *
 * Aufgebaut nach dem, was man einstellen kann, nicht nach dem, was im Code
 * zusammenliegt: erst die Schalter, dann die festen Angaben zu Region und
 * Ablage, zuletzt die Vorschaudaten.
 *
 * Ein Schalter, der heute nichts bewirkt, trägt sichtbar „Phase 2“. Lieber
 * ein ehrlicher Vermerk als die Täuschung, man hätte gerade etwas umgestellt.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Seitenkopf } from "../components/AppLayout";
import { Regler } from "../components/Felder";
import { useAuth } from "../lib/auth";
import { GRUPPEN } from "../lib/einstellungen";
import { useEinstellungen } from "../lib/einstellungenStore";
import { DOKUMENT_ORDNER, BUNDESLAND_NAMEN, GRUNDERWERBSTEUER, f } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { STADTTEIL_NAMEN } from "../lib/stadtteile";
import { cn } from "../lib/utils";
import { useVermietung } from "../lib/vermietungStore";

export const Route = createFileRoute("/einstellungen")({ component: EinstellungenSeite });

const PHASE_2 = [
  "Supabase als Datenbank — Objekte, Einheiten und Verlauf werden echt gespeichert",
  "Google Drive: jeder Ordner der Ablage wird im Shared Drive angelegt und gespiegelt",
  "Dateien liegen im Drive, die Plattform zeigt nur noch darauf",
  "Übergabe an AUVERO, sobald eine Einheit auf „Im Vertrieb“ geht",
  "Weitere Städte: Augsburg, Stuttgart, Memmingen",
  "Mehrere Nutzer mit Rollen statt eines festen Zugangs",
];

function EinstellungenSeite() {
  const { nutzer } = useAuth();
  const { objekte, zuruecksetzen: objekteZurueck } = useObjekte();
  const { garantien, mieter, zuruecksetzen: garantienZurueck } = useVermietung();
  const { einstellungen, umschalten, zuruecksetzen: einstellungenZurueck } = useEinstellungen();
  const [frage, setFrage] = useState(false);

  const ulm = STADTTEIL_NAMEN.filter((s) => s.stadt === "Ulm").length;
  const neuUlm = STADTTEIL_NAMEN.filter((s) => s.stadt === "Neu-Ulm").length;

  const aktiveSchalter = GRUPPEN.flatMap((g) => g.eintraege).filter(
    (e) => einstellungen[e.schluessel],
  ).length;

  return (
    <>
      <Seitenkopf titel="Einstellungen" />

      {/* Trennlinien nur zwischen den Großabschnitten — innerhalb reicht der
          Abstand. Jede Zeile ihre eigene Linie ergäbe ein Gitter aus Strichen. */}
      <div className="divide-y divide-linie">
        {/* ----- Konto ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Zugang</h2>
          {nutzer && (
            <dl className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:max-w-2xl">
              {[
                ["Name", nutzer.name],
                ["Rolle", nutzer.rolle],
                ["E-Mail", nutzer.email],
                ["Gesellschaft", "Revest Projekt GmbH"],
              ].map(([titel, wert]) => (
                <div key={titel}>
                  <dt className="mini-label">{titel}</dt>
                  <dd className="mt-1.5 text-[0.84rem] text-tinte">{wert}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* ----- Schalter ----- */}
        {GRUPPEN.map((gruppe) => (
          <section key={gruppe.titel} className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
            <h2 className="mini-label">{gruppe.titel}</h2>
            {/* Weder Kästen noch Striche: die Zeilen gehören zusammen, und der
                Schalter rechts markiert den Rand jeder Zeile schon selbst. */}
            <div className="mt-6 -ml-2 flex max-w-3xl flex-col gap-1">
              {gruppe.eintraege.map((e) => (
                <Regler
                  key={e.schluessel}
                  titel={e.titel}
                  vermerk={e.wirkt ? undefined : "Phase 2"}
                  an={einstellungen[e.schluessel]}
                  umschalten={() => umschalten(e.schluessel)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* ----- Region ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Region</h2>
          <dl className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-3 lg:max-w-2xl">
            {[
              ["Ulm", `${ulm} Stadtteile`, `Grunderwerbsteuer ${f.prozent(GRUNDERWERBSTEUER.BW)}`],
              [
                "Neu-Ulm",
                `${neuUlm} Stadtteile`,
                `Grunderwerbsteuer ${f.prozent(GRUNDERWERBSTEUER.BY)}`,
              ],
              ["Objekte", `${objekte.length} erfasst`, "in dieser Vorschau"],
            ].map(([titel, wert, unten]) => (
              <div key={titel}>
                <dt className="mini-label">{titel}</dt>
                <dd className="zahl mt-1.5 text-[0.84rem] text-tinte">{wert}</dd>
                <div className="mt-0.5 text-[0.65rem] text-grau">{unten}</div>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[0.68rem] text-grau">
            Steuersätze hinterlegt für{" "}
            {Object.keys(GRUNDERWERBSTEUER)
              .map((k) => `${BUNDESLAND_NAMEN[k]} ${f.prozent(GRUNDERWERBSTEUER[k])}`)
              .join(" · ")}
          </p>
        </section>

        {/* ----- Ordner ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Ordnerstruktur</h2>
          {/* Zehn umrandete Kästchen waren zwanzig Linien für eine Liste, die
              nur gelesen wird. Jetzt trägt die Nummer die Ordnung. */}
          <ol className="mt-5 grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:max-w-2xl">
            {DOKUMENT_ORDNER.map((o, i) => (
              <li
                key={o.schluessel}
                className="flex items-baseline gap-3.5 text-[0.78rem] text-grau-stark"
              >
                <span className="zahl shrink-0 text-[0.62rem] text-grau">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {o.titel}
              </li>
            ))}
          </ol>
        </section>

        {/* ----- Phase 2 ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Was Phase 2 bringt</h2>
          <ul className="mt-5 flex max-w-2xl flex-col gap-3.5">
            <li className="flex items-start gap-3">
              <Spur fertig />
              <span className="text-[0.8rem] text-tinte">
                Vollständiges Frontend — Karte, Anlagemaske, Einheiten, Dokumente, Verlauf
              </span>
            </li>
            {PHASE_2.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <Spur />
                <span className="text-[0.8rem] leading-relaxed text-grau">{t}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ----- Daten ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Vorschaudaten</h2>
          <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-5">
            {[
              ["Objekte", objekte.length],
              ["Mietgarantien", garantien.length],
              ["Mieter", mieter.length],
              ["Schalter aktiv", aktiveSchalter],
            ].map(([titel, anzahl]) => (
              <div key={titel}>
                <dt className="mini-label">{titel}</dt>
                <dd className="zahl mt-1 text-[0.84rem] text-tinte">{anzahl}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!frage ? (
              <button
                type="button"
                onClick={() => setFrage(true)}
                className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2.5 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-tinte"
              >
                <RotateCcw size={13} strokeWidth={2} />
                Zurücksetzen
              </button>
            ) : (
              <div className="eintritt flex flex-wrap items-center gap-3">
                <span className="text-[0.76rem] text-tinte">Eigene Eingaben verwerfen?</span>
                <button
                  type="button"
                  onClick={() => {
                    objekteZurueck();
                    garantienZurueck();
                    einstellungenZurueck();
                    setFrage(false);
                  }}
                  className="druckbar rounded-full bg-tinte px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
                >
                  Ja, zurücksetzen
                </button>
                <button
                  type="button"
                  onClick={() => setFrage(false)}
                  className="druckbar rounded-full px-3 py-2.5 text-[0.66rem] tracking-[0.14em] uppercase text-grau hover:text-tinte"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

/** Erledigt oder offen — als Zeichen, nicht als Farbe. */
function Spur({ fertig }: { fertig?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-[0.2rem] flex size-4 shrink-0 items-center justify-center rounded-full border",
        fertig ? "border-tinte bg-tinte text-grund" : "border-linie-stark text-grau",
      )}
    >
      {fertig ? <Check size={10} strokeWidth={3} /> : <Minus size={10} strokeWidth={2.5} />}
    </span>
  );
}
