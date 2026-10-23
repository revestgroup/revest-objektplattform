/**
 * Backoffice.
 *
 * Die Seite beantwortet zwei Fragen, und deshalb hat sie zwei Zustände.
 *
 * „Was liegt noch rum?" — der Posteingang. Hier steht jeder frische Scan mit
 * dem, was die Erkennung herausgelesen hat. Man korrigiert, was falsch ist,
 * und nickt ab. Das ist die eigentliche Arbeit; alles andere ist Nachschlagen.
 *
 * „Wo ist das Schreiben vom Finanzamt?" — die Ablage, je Firma und Ordner.
 *
 * Die Ordnerstruktur ist dieselbe, die später im Google Drive entsteht. Die
 * Datei liegt dort, der Index hier — wer eine Datei sucht, folgt dem Link.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Check,
  FileText,
  Inbox,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Schublade, Seitenkopf } from "../components/AppLayout";
import { Auswahlfeld, Bereich, Huelle, Textfeld, Zahlfeld } from "../components/Felder";
import {
  BACKOFFICE_BEISPIELE,
  BACKOFFICE_ORDNER,
  FIRMEN,
  FIRMEN_REIHENFOLGE,
  SCHWELLE_SICHER,
  fehlendeFelder,
  istVollstaendig,
  ordnerTitel,
  sortiereAblage,
  sortierePosteingang,
  type Beleg,
  type Firma,
} from "../lib/backoffice";
import { useBackoffice } from "../lib/backofficeStore";
import { f } from "../lib/objekte";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/backoffice")({ component: BackofficeSeite });

/** Posteingang oder eine der drei Firmen. */
type Reiter = "eingang" | Firma;

function BackofficeSeite() {
  const { belege, bereit } = useBackoffice();
  const [reiter, setReiter] = useState<Reiter>("eingang");
  const [erfassen, setErfassen] = useState(false);

  const eingang = useMemo(
    () => belege.filter((b) => !b.bestaetigtAm).sort(sortierePosteingang),
    [belege],
  );

  if (!bereit) return <div className="h-96" />;

  return (
    <>
      <Seitenkopf
        titel="Backoffice"
        aktion={
          <button
            type="button"
            onClick={() => setErfassen(true)}
            className="druckbar flex items-center gap-2 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
          >
            <Plus size={14} strokeWidth={2.25} />
            Beleg erfassen
          </button>
        }
      />

      {/* ----- Reiter ----- */}
      <div className="sticky top-0 z-20 border-b border-linie bg-grund/95 backdrop-blur-sm">
        <div className="scroll-reihe flex items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 md:px-10">
          <Reiterknopf
            aktiv={reiter === "eingang"}
            waehlen={() => setReiter("eingang")}
            titel="Posteingang"
            zahl={eingang.length}
            icon={Inbox}
          />
          <span aria-hidden className="my-1 w-px shrink-0 bg-linie" />
          {FIRMEN_REIHENFOLGE.map((firma) => (
            <Reiterknopf
              key={firma}
              aktiv={reiter === firma}
              waehlen={() => setReiter(firma)}
              titel={FIRMEN[firma].titel}
              zahl={belege.filter((b) => b.bestaetigtAm && b.firma === firma).length}
              punkt={FIRMEN[firma].farbe}
            />
          ))}
        </div>
      </div>

      {reiter === "eingang" ? (
        <Posteingang belege={eingang} />
      ) : (
        <Ablage firma={reiter} belege={belege} />
      )}

      <Schublade offen={erfassen} schliessen={() => setErfassen(false)} titel="Beleg erfassen">
        <Erfassungsformular fertig={() => setErfassen(false)} />
      </Schublade>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reiter                                                               */
/* ------------------------------------------------------------------ */

function Reiterknopf({
  aktiv,
  waehlen,
  titel,
  zahl,
  icon: Icon,
  punkt,
}: {
  aktiv: boolean;
  waehlen: () => void;
  titel: string;
  zahl: number;
  icon?: typeof Inbox;
  punkt?: string;
}) {
  return (
    <button
      type="button"
      onClick={waehlen}
      aria-pressed={aktiv}
      className={cn(
        "druckbar flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.7rem] font-medium whitespace-nowrap",
        aktiv ? "border-tinte bg-tinte text-grund" : "border-linie bg-flaeche text-grau-stark",
      )}
    >
      {Icon && <Icon size={13} strokeWidth={2} />}
      {punkt && (
        <span aria-hidden className="size-2 rounded-full" style={{ background: punkt }} />
      )}
      {titel}
      <span className={cn("zahl tabular-nums", aktiv ? "text-grund/70" : "text-grau")}>{zahl}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Posteingang                                                          */
/* ------------------------------------------------------------------ */

function Posteingang({ belege }: { belege: Beleg[] }) {
  if (belege.length === 0) {
    return (
      <div className="px-4 py-16 sm:px-6 md:px-10">
        <p className="mx-auto max-w-md rounded-2xl border border-dashed border-linie-stark px-6 py-14 text-center text-[0.8rem] text-grau">
          Posteingang leer. Alles abgelegt.
        </p>
      </div>
    );
  }

  const unsicher = belege.filter((b) => b.sicherheit < SCHWELLE_SICHER).length;

  return (
    <div className="px-4 py-5 pb-10 sm:px-6 md:px-10 md:py-7">
      <p className="text-[0.76rem] text-grau">
        {belege.length} {belege.length === 1 ? "Scan wartet" : "Scans warten"} auf Abnahme
        {unsicher > 0 && `, ${unsicher} davon unsicher erkannt`}.
      </p>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {belege.map((b) => (
          <Eingangskarte key={b.id} beleg={b} />
        ))}
      </div>
    </div>
  );
}

/**
 * Ein Scan im Posteingang.
 *
 * Die erkannten Werte stehen als Felder da, nicht als Text — wer korrigieren
 * will, tippt sofort los, statt erst einen Bearbeiten-Knopf zu suchen. Der
 * Abnicken-Knopf bleibt gesperrt, solange Firma oder Ordner fehlen, denn ohne
 * beides weiß die Ablage nicht, wohin die Datei gehört.
 */
function Eingangskarte({ beleg }: { beleg: Beleg }) {
  const { aendern, bestaetigen, loeschen } = useBackoffice();
  const unsicher = beleg.sicherheit < SCHWELLE_SICHER;
  const fehlt = fehlendeFelder(beleg);
  const bereitZurAblage = istVollstaendig(beleg);

  return (
    <article
      className={cn(
        "rounded-2xl border bg-flaeche p-4 shadow-karte md:p-5",
        unsicher ? "border-[#E3BDB9]" : "border-linie",
      )}
    >
      {/* ----- Kopf: woher der Scan kommt ----- */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            unsicher ? "bg-[#F8DEDC]" : "bg-flaeche-hoch",
          )}
        >
          {unsicher ? (
            <TriangleAlert size={16} strokeWidth={1.9} className="text-[#8A2822]" />
          ) : (
            <FileText size={16} strokeWidth={1.8} className="text-grau-stark" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="zahl truncate text-[0.68rem] text-grau">
            {beleg.dateiname} · {beleg.seiten} {beleg.seiten === 1 ? "Seite" : "Seiten"} ·{" "}
            {new Date(beleg.gescanntAm).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "short",
            })}
          </p>
          {unsicher && (
            <p className="mt-0.5 text-[0.68rem] font-medium text-[#8A2822]">
              Erkennung unsicher — bitte prüfen
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => loeschen(beleg.id)}
          aria-label="Scan verwerfen"
          className="druckbar flex size-8 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte"
        >
          <Trash2 size={14} strokeWidth={1.9} />
        </button>
      </div>

      {/* ----- Was die Erkennung gelesen hat ----- */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Textfeld
          id={`titel-${beleg.id}`}
          label="Betreff"
          wert={beleg.titel}
          setWert={(v) => aendern(beleg.id, { titel: v })}
          platzhalter="Worum geht es?"
          breit
        />
        <Auswahlfeld
          id={`firma-${beleg.id}`}
          label="Firma"
          wert={beleg.firma ?? ""}
          setWert={(v) => aendern(beleg.id, { firma: (v || null) as Firma | null })}
          optionen={FIRMEN_REIHENFOLGE.map((k) => ({ wert: k, titel: FIRMEN[k].titel }))}
          leerText="Nicht erkannt"
        />
        <Auswahlfeld
          id={`ordner-${beleg.id}`}
          label="Ordner"
          wert={beleg.ordner ?? ""}
          setWert={(v) => aendern(beleg.id, { ordner: v || null })}
          optionen={BACKOFFICE_ORDNER.map((o) => ({ wert: o.schluessel, titel: o.titel }))}
          leerText="Nicht erkannt"
        />
        <Textfeld
          id={`absender-${beleg.id}`}
          label="Absender"
          wert={beleg.absender ?? ""}
          setWert={(v) => aendern(beleg.id, { absender: v || null })}
          platzhalter="Wer schickt es?"
        />
        <Huelle id={`datum-${beleg.id}`} label="Belegdatum">
          <input
            id={`datum-${beleg.id}`}
            type="date"
            value={beleg.datum ?? ""}
            onChange={(e) => aendern(beleg.id, { datum: e.target.value || null })}
            className="zahl w-full rounded-lg border border-linie bg-flaeche px-3 py-2 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none"
          />
        </Huelle>
        <Zahlfeld
          id={`betrag-${beleg.id}`}
          label="Betrag"
          wert={beleg.betrag === null ? "" : String(beleg.betrag)}
          setWert={(v) => aendern(beleg.id, { betrag: v === "" ? null : Number(v) })}
          einheit="€"
          schritt="0.01"
          platzhalter="ohne"
        />
      </div>

      {/* ----- Abnicken ----- */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-linie pt-3.5">
        <p className="min-w-0 text-[0.68rem] text-grau">
          {fehlt.length > 0 ? `Fehlt noch: ${fehlt.join(", ")}` : "Vollständig"}
        </p>
        <button
          type="button"
          onClick={() => bestaetigen(beleg.id, true)}
          disabled={!bereitZurAblage}
          className={cn(
            "druckbar flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[0.64rem] font-semibold tracking-[0.1em] uppercase",
            bereitZurAblage
              ? "bg-tinte text-grund"
              : "cursor-not-allowed bg-flaeche-aktiv text-grau",
          )}
        >
          <Check size={13} strokeWidth={2.4} />
          Ablegen
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Ablage je Firma                                                      */
/* ------------------------------------------------------------------ */

function Ablage({ firma, belege }: { firma: Firma; belege: Beleg[] }) {
  const [ordner, setOrdner] = useState<string>("");
  const [suche, setSuche] = useState("");

  const eigene = useMemo(
    () => belege.filter((b) => b.bestaetigtAm && b.firma === firma),
    [belege, firma],
  );

  const gefiltert = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return eigene
      .filter((b) => {
        if (ordner && b.ordner !== ordner) return false;
        if (!begriff) return true;
        return [b.titel, b.absender, b.dateiname, ordnerTitel(b.ordner)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(begriff);
      })
      .sort(sortiereAblage);
  }, [eigene, ordner, suche]);

  const info = FIRMEN[firma];

  return (
    <div className="px-4 py-5 pb-10 sm:px-6 md:px-10 md:py-7">
      {/* ----- Firma ----- */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[0.66rem] font-semibold tracking-wider text-grund"
          style={{ background: info.farbe }}
        >
          {info.kurz}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[0.95rem] font-semibold text-tinte">{info.titel}</h2>
          <p className="truncate text-[0.68rem] text-grau">
            {info.zweck} · {eigene.length} {eigene.length === 1 ? "Beleg" : "Belege"}
          </p>
        </div>
      </div>

      {/* ----- Suche ----- */}
      <div className="relative mt-4">
        <Search
          size={15}
          strokeWidth={1.9}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-grau"
        />
        <input
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Betreff, Absender, Ordner"
          aria-label="Belege durchsuchen"
          className="w-full rounded-full border border-linie bg-flaeche py-2.5 pr-4 pl-10 text-[0.78rem] text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
        />
      </div>

      {/* ----- Ordner ----- */}
      <div className="scroll-reihe mt-3 flex gap-2 overflow-x-auto pb-1">
        <Ordnerchip
          titel="Alle"
          zahl={eigene.length}
          aktiv={ordner === ""}
          waehlen={() => setOrdner("")}
        />
        {BACKOFFICE_ORDNER.map((o) => {
          const zahl = eigene.filter((b) => b.ordner === o.schluessel).length;
          if (zahl === 0) return null;
          return (
            <Ordnerchip
              key={o.schluessel}
              titel={o.titel}
              zahl={zahl}
              aktiv={ordner === o.schluessel}
              waehlen={() => setOrdner(ordner === o.schluessel ? "" : o.schluessel)}
            />
          );
        })}
      </div>

      {/* ----- Belege ----- */}
      {gefiltert.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-linie-stark px-6 py-12 text-center text-[0.78rem] text-grau">
          {eigene.length === 0 ? "Noch nichts abgelegt." : "Nichts gefunden."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-linie overflow-hidden rounded-2xl border border-linie bg-flaeche shadow-karte">
          {gefiltert.map((b) => (
            <Ablagezeile key={b.id} beleg={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Ordnerchip({
  titel,
  zahl,
  aktiv,
  waehlen,
}: {
  titel: string;
  zahl: number;
  aktiv: boolean;
  waehlen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={waehlen}
      aria-pressed={aktiv}
      className={cn(
        "druckbar flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.68rem] whitespace-nowrap",
        aktiv ? "border-tinte bg-tinte text-grund" : "border-linie bg-flaeche text-grau-stark",
      )}
    >
      {titel}
      <span className={cn("zahl tabular-nums", aktiv ? "text-grund/70" : "text-grau")}>{zahl}</span>
    </button>
  );
}

/**
 * Eine Zeile der Ablage. Der Rückholknopf ist kein Zierrat: eine falsche
 * Zuordnung fällt meist erst beim Suchen auf, und dann will man sie dort
 * korrigieren, wo man gerade steht.
 */
function Ablagezeile({ beleg }: { beleg: Beleg }) {
  const { bestaetigen } = useBackoffice();

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-flaeche-hoch"
      >
        <FileText size={15} strokeWidth={1.8} className="text-grau-stark" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8rem] font-medium text-tinte">{beleg.titel}</span>
        <span className="zahl block truncate text-[0.66rem] text-grau">
          {ordnerTitel(beleg.ordner)}
          {beleg.absender ? ` · ${beleg.absender}` : ""}
          {beleg.datum
            ? ` · ${new Date(beleg.datum).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              })}`
            : ""}
        </span>
      </span>

      {beleg.betrag !== null && (
        <span className="zahl shrink-0 text-[0.74rem] font-medium text-tinte tabular-nums">
          {f.eurKurz(beleg.betrag)}
        </span>
      )}

      <button
        type="button"
        onClick={() => bestaetigen(beleg.id, false)}
        title="Zurück in den Posteingang"
        aria-label="Zurück in den Posteingang"
        className="druckbar flex size-8 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte"
      >
        <Undo2 size={14} strokeWidth={1.9} />
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Beleg von Hand erfassen                                              */
/* ------------------------------------------------------------------ */

/**
 * Für alles, was nicht durch den Scanner geht — eine Mail, ein Foto vom
 * Handy, ein Schreiben, das jemand mitgebracht hat. Der Beleg landet im
 * Posteingang wie jeder Scan, nur mit voller Sicherheit: ein Mensch hat ihn
 * schließlich selbst eingetragen.
 */
function Erfassungsformular({ fertig }: { fertig: () => void }) {
  const { anlegen } = useBackoffice();
  const [titel, setTitel] = useState("");
  const [firma, setFirma] = useState<Firma | "">("");
  const [ordner, setOrdner] = useState("");
  const [absender, setAbsender] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [betrag, setBetrag] = useState("");
  const [seiten, setSeiten] = useState("1");
  const [gesendet, setGesendet] = useState(false);

  const fehlerTitel = gesendet && !titel.trim() ? "Betreff fehlt" : undefined;

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    setGesendet(true);
    if (!titel.trim()) return;

    anlegen({
      titel: titel.trim(),
      firma: firma || null,
      ordner: ordner || null,
      absender: absender.trim() || null,
      datum: datum || null,
      betrag: betrag === "" ? null : Number(betrag),
      sicherheit: 1,
      dateiname: "manuell-erfasst.pdf",
      seiten: Math.max(1, Number(seiten) || 1),
    });
    fertig();
  }

  return (
    <form onSubmit={absenden} className="space-y-6 px-5 py-6 md:px-7">
      <Bereich titel="Beleg">
        <Textfeld
          id="neu-titel"
          label="Betreff"
          wert={titel}
          setWert={setTitel}
          platzhalter="Rechnung Dachdecker Oktober"
          pflicht
          fehler={fehlerTitel}
          breit
        />
        <Auswahlfeld
          id="neu-firma"
          label="Firma"
          wert={firma}
          setWert={(v) => setFirma(v as Firma | "")}
          optionen={FIRMEN_REIHENFOLGE.map((k) => ({ wert: k, titel: FIRMEN[k].titel }))}
          leerText="Später zuordnen"
        />
        <Auswahlfeld
          id="neu-ordner"
          label="Ordner"
          wert={ordner}
          setWert={setOrdner}
          optionen={BACKOFFICE_ORDNER.map((o) => ({ wert: o.schluessel, titel: o.titel }))}
          leerText="Später zuordnen"
          hinweis={ordner ? BACKOFFICE_BEISPIELE[ordner] : undefined}
        />
      </Bereich>

      <Bereich titel="Herkunft">
        <Textfeld
          id="neu-absender"
          label="Absender"
          wert={absender}
          setWert={setAbsender}
          platzhalter="Firma oder Behörde"
        />
        <Huelle id="neu-datum" label="Belegdatum">
          <input
            id="neu-datum"
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="zahl w-full rounded-lg border border-linie bg-flaeche px-3 py-2 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none"
          />
        </Huelle>
        <Zahlfeld
          id="neu-betrag"
          label="Betrag"
          wert={betrag}
          setWert={setBetrag}
          einheit="€"
          schritt="0.01"
          platzhalter="ohne"
        />
        <Zahlfeld id="neu-seiten" label="Seiten" wert={seiten} setWert={setSeiten} schritt="1" />
      </Bereich>

      <div className="flex gap-3 border-t border-linie pt-5">
        <button
          type="submit"
          className="druckbar flex flex-1 items-center justify-center gap-2 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund"
        >
          <Building2 size={14} strokeWidth={2.1} />
          In den Posteingang
        </button>
        <button
          type="button"
          onClick={fertig}
          className="druckbar rounded-full border border-linie px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grau-stark"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
