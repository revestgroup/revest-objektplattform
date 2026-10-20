/**
 * Einstellungen.
 *
 * Phase 1 hat nichts zu konfigurieren — deshalb steht hier stattdessen,
 * was die Plattform heute kann und was Phase 2 bringt. Das ist für Timo
 * nützlicher als leere Schalter.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Seitenkopf } from "../components/AppLayout";
import { useAuth } from "../lib/auth";
import { DOKUMENT_ORDNER, BUNDESLAND_NAMEN, GRUNDERWERBSTEUER, f } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { STADTTEIL_NAMEN } from "../lib/stadtteile";
import { cn } from "../lib/utils";

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
  const { objekte, zuruecksetzen } = useObjekte();
  const [frage, setFrage] = useState(false);

  const ulm = STADTTEIL_NAMEN.filter((s) => s.stadt === "Ulm").length;
  const neuUlm = STADTTEIL_NAMEN.filter((s) => s.stadt === "Neu-Ulm").length;

  return (
    <>
      <Seitenkopf
        label="Konto und Plattform"
        titel="Einstellungen"
        beschreibung="Diese Vorschau läuft vollständig im Browser. Nichts wird an einen Server gesendet."
      />

      <div className="divide-y divide-linie">
        {/* ----- Konto ----- */}
        <section className="px-6 py-8 md:px-10">
          <h2 className="mini-label">Zugang</h2>
          {nutzer && (
            <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:max-w-2xl">
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

        {/* ----- Region ----- */}
        <section className="px-6 py-8 md:px-10">
          <h2 className="mini-label">Region</h2>
          <p className="mt-2 max-w-xl text-[0.72rem] leading-relaxed text-grau">
            Die Stadtteilgrenzen kommen aus OpenStreetMap und liegen als Datei im Projekt — die
            Karte braucht dafür keine Verbindung.
          </p>
          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-3 lg:max-w-2xl">
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
        <section className="px-6 py-8 md:px-10">
          <h2 className="mini-label">Ordnerstruktur</h2>
          <p className="mt-2 max-w-xl text-[0.72rem] leading-relaxed text-grau">
            Diese zehn Ordner stehen fest. Sie werden in Phase 2 eins zu eins im Google Drive
            angelegt, damit beide Seiten dieselbe Struktur haben.
          </p>
          <ol className="mt-5 grid gap-1.5 sm:grid-cols-2 lg:max-w-3xl">
            {DOKUMENT_ORDNER.map((o, i) => (
              <li
                key={o.schluessel}
                className="flex items-baseline gap-3 rounded-xl border border-linie bg-flaeche px-4 py-2.5 text-[0.76rem] text-grau-stark"
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
        <section className="px-6 py-8 md:px-10">
          <h2 className="mini-label">Was Phase 2 bringt</h2>
          <ul className="mt-5 flex max-w-2xl flex-col gap-2.5">
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
        <section className="px-6 py-8 md:px-10">
          <h2 className="mini-label">Vorschaudaten</h2>
          <p className="mt-2 max-w-xl text-[0.72rem] leading-relaxed text-grau">
            Änderungen liegen im Speicher dieses Browsers. Zurücksetzen stellt die
            Beispielobjekte wieder her — eigene Eingaben gehen dabei verloren.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
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
                    zuruecksetzen();
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
      {fertig ? (
        <Check size={10} strokeWidth={3} />
      ) : (
        <Minus size={10} strokeWidth={2.5} />
      )}
    </span>
  );
}
