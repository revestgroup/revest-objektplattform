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
import { SuchprofilPflegen } from "../components/Eingang";
import { KalkulationsVorgaben } from "../components/KalkulationEtw";
import { KategorienPflegen } from "./kontakte";
import { useAuth } from "../lib/auth";
import { GRUPPEN } from "../lib/einstellungen";
import { useEingang } from "../lib/eingangStore";
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
  const { zuruecksetzen: eingangZurueck } = useEingang();
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

        {/* ----- Kontakte ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Kontaktkategorien</h2>
          <p className="mt-2 max-w-2xl text-[0.7rem] leading-relaxed text-grau">
            Aus monday übernommen, in vier Gruppen. Genutzte Kategorien lassen sich nicht entfernen.
          </p>
          <KategorienPflegen />
        </section>

        {/* ----- Ankauf-Eingang ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Suchprofil Ankauf</h2>
          <p className="mt-2 max-w-2xl text-[0.7rem] leading-relaxed text-grau">
            Was nicht passt, steht im Eingang unten und ist markiert — aussortiert wird es nicht
            automatisch.
          </p>
          <SuchprofilPflegen />
        </section>

        {/* ----- Kalender ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Google Kalender</h2>
          <p className="mt-2 max-w-2xl text-[0.7rem] leading-relaxed text-grau">
            Kalender-ID für „Kalender“ und die Termine auf der Startseite. Zu finden in Google
            Kalender → Einstellungen → Kalender auswählen → „Kalender integrieren“ → Kalender-ID
            (beim eigenen Kalender die E-Mail-Adresse). Ein privater Kalender ist nur sichtbar, wenn
            du im selben Browser bei Google angemeldet bist.
          </p>
          <Kalenderfeld />
        </section>

        {/* ----- Ziele ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Ziele</h2>
          <p className="mt-2 max-w-2xl text-[0.7rem] leading-relaxed text-grau">
            Erscheinen in der Auswertung als Fortschrittsbalken, umgerechnet auf den gewählten
            Zeitraum. Leer heißt: kein Ziel.
          </p>
          <Zielfelder />
        </section>

        {/* ----- Bankverbindung ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Bankverbindung für Abrechnungen</h2>
          <p className="mt-2 max-w-2xl text-[0.7rem] leading-relaxed text-grau">
            Steht in der Abrechnung an Käufer (Nachberechnung). Nur in diesem Browser gespeichert.
          </p>
          <Bankfelder />
        </section>

        {/* ----- Kalkulation ----- */}
        <section className="px-4 py-7 sm:px-6 md:px-10 md:py-10">
          <h2 className="mini-label">Kalkulation ETW</h2>
          <p className="mt-2 max-w-2xl text-[0.7rem] leading-relaxed text-grau">
            Standardwerte für jede neue Kalkulation. Ein Objekt, das einen Wert selbst überschreibt,
            behält ihn. Leere Felder rechnen mit der Vorlage aus Timos Excel.
          </p>
          <KalkulationsVorgaben />
        </section>

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
          {/* So wie im Google Drive: Hauptordner mit eingerückten Unterordnern.
              Die Nummer kommt aus dem Drive-Namen und trägt die Ordnung. */}
          <ol className="mt-5 flex flex-col gap-y-3 lg:max-w-2xl">
            {DOKUMENT_ORDNER.map((o) => (
              <li
                key={o.schluessel}
                className={cn(
                  "flex items-baseline gap-3.5 text-[0.78rem]",
                  o.tiefe === 0 ? "text-tinte" : "text-grau-stark",
                )}
                style={{ paddingLeft: `${o.tiefe * 1.5}rem` }}
              >
                <span className="zahl shrink-0 text-[0.62rem] text-grau">{o.nummer}</span>
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
                    eingangZurueck();
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

function Bankfelder() {
  const { bank, bankSetzen } = useEinstellungen();
  const feld =
    "h-9 w-full rounded-xl border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";
  return (
    // key: nach dem Laden aus dem Speicher die Felder neu vorbelegen.
    <div
      key={`${bank.inhaber}|${bank.iban}`}
      className="mt-4 grid max-w-2xl gap-2.5 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1">
        <span className="mini-label">Kontoinhaber</span>
        <input
          className={feld}
          defaultValue={bank.inhaber}
          onBlur={(e) => bankSetzen({ ...bank, inhaber: e.target.value.trim() })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="mini-label">IBAN</span>
        <input
          className={cn(feld, "zahl")}
          defaultValue={bank.iban}
          placeholder="DE.."
          onBlur={(e) => bankSetzen({ ...bank, iban: e.target.value.replace(/\s+/g, " ").trim() })}
        />
      </label>
    </div>
  );
}

function Zielfelder() {
  const { ziele, zieleSetzen } = useEinstellungen();
  const feld =
    "zahl h-9 w-full rounded-xl border border-linie bg-flaeche px-3 text-right text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";
  const zahl = (t: string) => {
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    return t.trim() === "" || !Number.isFinite(n) ? null : n;
  };
  const felder = [
    ["leadsWoche", "Leads pro Woche"],
    ["besichtigungenMonat", "Besichtigungen pro Monat"],
    ["angeboteMonat", "Angebote pro Monat"],
    ["ankaeufeJahr", "Ankäufe pro Jahr"],
    ["jahresgewinn", "Jahresgewinn €"],
    ["haengtNachTagen", "Lead hängt nach Tagen"],
  ] as const;
  return (
    <div key={JSON.stringify(ziele)} className="mt-4 grid max-w-3xl gap-2.5 sm:grid-cols-3">
      {felder.map(([k, t]) => (
        <label key={k} className="flex flex-col gap-1">
          <span className="mini-label">{t}</span>
          <input
            className={feld}
            inputMode="numeric"
            defaultValue={ziele[k] ?? ""}
            onBlur={(e) => {
              const n = zahl(e.target.value);
              zieleSetzen(k === "haengtNachTagen" ? { haengtNachTagen: n ?? 21 } : { [k]: n });
            }}
          />
        </label>
      ))}
    </div>
  );
}

function Kalenderfeld() {
  const { kalenderId, kalenderIdSetzen } = useEinstellungen();
  return (
    <input
      key={kalenderId}
      defaultValue={kalenderId}
      onBlur={(e) => kalenderIdSetzen(e.target.value.trim())}
      placeholder="name@revest-projekt.de"
      aria-label="Google-Kalender-ID"
      className="mt-4 h-9 w-full max-w-md rounded-xl border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none"
    />
  );
}
