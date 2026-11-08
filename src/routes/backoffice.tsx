/**
 * Backoffice — der Posteingang für alles, was reinkommt. Simpel wie Trello.
 *
 * Links die Arbeitsspalten (Posteingang · Besprechung · In Arbeit · Erledigt),
 * rechts farblich abgesetzt die Weiterleitungen (→ Qonto · → Projekt · →
 * Ablage). Eine Karte, die dort abgelegt wird, fragt kurz nach dem Ziel und
 * landet dann vermerkt in „Erledigt“.
 *
 * Dateien auf den Posteingang ziehen = je Datei eine Karte. „+ Karte“ für
 * reine To-dos. Eine Karte öffnet im großen Fenster wie ein Objekt.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, CheckSquare, FileText, ListPlus, Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Fenster, Seitenkopf } from "../components/AppLayout";
import { Dialog } from "../components/Dialog";
import { useSeitlichScroll } from "../components/SeitlichScroll";
import { useAufgaben } from "../lib/aufgabenStore";
import { useAuth } from "../lib/auth";
import {
  ABLAGE_GESELLSCHAFTEN,
  ABLAGE_ORDNER,
  KARTENARTEN,
  KARTENQUELLEN,
  SPALTEN,
  WEITERLEITUNGEN,
  ablageOrdnerVorschlag,
  istUeberfaellig,
  type Backofficekarte,
  type Kartenart,
  type Spalte,
  type Weiterleitung,
} from "../lib/backoffice";
import { neueKartenId, useBackoffice } from "../lib/backofficeStore";
import { DOKUMENT_ORDNER, UNSORTIERT, f, ordnerVorschlag, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/backoffice")({
  validateSearch: (such: Record<string, unknown>): { karte?: string } =>
    typeof such.karte === "string" ? { karte: such.karte } : {},
  component: BackofficeSeite,
});

const objektTitel = (o: Objekt) =>
  `${o.kuerzel ? `${o.kuerzel} · ` : ""}${o.bezeichnung?.trim() || o.strasse}`;

/* ------------------------------------------------------------------ */
/* Seite                                                                */
/* ------------------------------------------------------------------ */

function BackofficeSeite() {
  const { karte: offenId } = Route.useSearch();
  const navigate = useNavigate();
  const { karten, bereit, dateienAufnehmen, todoAnlegen, verschieben } = useBackoffice();
  const { objekte } = useObjekte();
  const { nutzer } = useAuth();

  const [filter, setFilter] = useState<{
    art: string;
    gesellschaft: string;
    objekt: string;
    meine: boolean;
  }>({
    art: "",
    gesellschaft: "",
    objekt: "",
    meine: false,
  });
  const [zieht, setZieht] = useState<string | null>(null);
  const [ueber, setUeber] = useState<string | null>(null);
  const [weiter, setWeiter] = useState<{ id: string; ziel: Weiterleitung } | null>(null);
  const [neuerTitel, setNeuerTitel] = useState<string | null>(null);
  const dateiRef = useRef<HTMLInputElement>(null);

  const sichtbar = useMemo(
    () =>
      karten.filter(
        (k) =>
          (!filter.art || k.art === filter.art) &&
          (!filter.gesellschaft || k.gesellschaft === filter.gesellschaft) &&
          (!filter.objekt || k.objektId === filter.objekt) &&
          (!filter.meine || k.zugewiesen === nutzer?.name),
      ),
    [karten, filter, nutzer?.name],
  );
  const seitlich = useSeitlichScroll([sichtbar.length]);

  const offen = offenId ? karten.find((k) => k.id === offenId) : undefined;

  function oeffnen(id: string | undefined) {
    void navigate({ to: "/backoffice", search: id ? { karte: id } : {} });
  }

  function ablegen(e: React.DragEvent, ziel: Spalte | Weiterleitung) {
    e.preventDefault();
    setUeber(null);
    // Dateien vom Rechner: nur auf den Posteingang, je Datei eine Karte.
    if (e.dataTransfer.files.length > 0 && !zieht) {
      if (ziel === "posteingang") dateienAufnehmen(Array.from(e.dataTransfer.files));
      return;
    }
    if (!zieht) return;
    if (ziel === "qonto" || ziel === "projekt" || ziel === "ablage") setWeiter({ id: zieht, ziel });
    else verschieben(zieht, ziel);
    setZieht(null);
  }

  const ziel = (id: string) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setUeber(id);
    },
    onDragLeave: () => setUeber((alt) => (alt === id ? null : alt)),
  });

  if (!bereit) return <div className="h-96" />;

  const auswahl =
    "h-8 rounded-full border border-linie bg-flaeche px-3 text-[0.72rem] text-grau-stark focus:border-linie-stark focus:outline-none";

  return (
    <>
      <Seitenkopf
        titel="Backoffice"
        aktion={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dateiRef.current?.click()}
              className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-tinte"
            >
              <Upload size={14} strokeWidth={2} />
              Dateien
            </button>
            <button
              type="button"
              onClick={() => setNeuerTitel("")}
              className="druckbar flex items-center gap-2 rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-grund"
            >
              <Plus size={14} strokeWidth={2.25} />
              Karte
            </button>
            <input
              ref={dateiRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) dateienAufnehmen(Array.from(e.target.files));
                e.target.value = "";
              }}
            />
          </div>
        }
      />

      {/* ----- Filter ----- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-linie px-4 py-3 sm:px-6 md:px-10">
        <select
          aria-label="Art"
          value={filter.art}
          onChange={(e) => setFilter({ ...filter, art: e.target.value })}
          className={auswahl}
        >
          <option value="">Alle Arten</option>
          {Object.entries(KARTENARTEN).map(([w, t]) => (
            <option key={w} value={w}>
              {t}
            </option>
          ))}
        </select>
        <select
          aria-label="Gesellschaft"
          value={filter.gesellschaft}
          onChange={(e) => setFilter({ ...filter, gesellschaft: e.target.value })}
          className={auswahl}
        >
          <option value="">Alle Gesellschaften</option>
          {ABLAGE_GESELLSCHAFTEN.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          aria-label="Objekt"
          value={filter.objekt}
          onChange={(e) => setFilter({ ...filter, objekt: e.target.value })}
          className={auswahl}
        >
          <option value="">Alle Objekte</option>
          {objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {objektTitel(o)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFilter({ ...filter, meine: !filter.meine })}
          aria-pressed={filter.meine}
          className={cn(
            "druckbar h-8 rounded-full border px-3 text-[0.72rem] font-medium",
            filter.meine
              ? "border-tinte bg-tinte text-grund"
              : "border-linie bg-flaeche text-grau-stark",
          )}
        >
          Mir zugewiesen
        </button>
      </div>

      {/* ----- Board ----- */}
      <div className="relative">
        {seitlich.pfeile}
        <div
          {...seitlich.leisteProps}
          onDragOver={(e) => zieht && seitlich.randScroll(e)}
          className="scroll-pipeline flex items-start gap-3 overflow-x-auto px-4 pt-5 pb-3 md:cursor-grab md:px-6"
        >
          {SPALTEN.map((s) => {
            const spalte = sichtbar.filter((k) => k.spalte === s.id);
            const hier = ueber === s.id;
            return (
              <section
                key={s.id}
                {...ziel(s.id)}
                onDrop={(e) => ablegen(e, s.id)}
                className={cn(
                  "flex w-[80vw] max-w-[19rem] shrink-0 flex-col overflow-hidden rounded-2xl bg-flaeche-hoch transition-colors duration-150 sm:w-[15rem]",
                  hier && "bg-flaeche-aktiv",
                )}
              >
                <header className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <h3 className="min-w-0 flex-1 truncate text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-tinte">
                    {s.titel}
                  </h3>
                  <span className="zahl rounded-full bg-flaeche px-2 py-0.5 text-[0.62rem] font-semibold text-grau-stark">
                    {spalte.length}
                  </span>
                </header>

                {s.id === "posteingang" && neuerTitel !== null && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!neuerTitel.trim()) return;
                      todoAnlegen(neuerTitel.trim());
                      setNeuerTitel(null);
                    }}
                    className="px-2 pb-2"
                  >
                    <input
                      autoFocus
                      value={neuerTitel}
                      onChange={(e) => setNeuerTitel(e.target.value)}
                      onBlur={() => !neuerTitel.trim() && setNeuerTitel(null)}
                      placeholder="Was ist zu tun?"
                      aria-label="Titel der neuen Karte"
                      className="w-full rounded-xl border border-tinte bg-flaeche px-3 py-2 text-[0.78rem] text-tinte focus:outline-none"
                    />
                  </form>
                )}

                <ul className="flex flex-col gap-2 px-2 pb-2">
                  {spalte.map((k) => (
                    <Kartenkachel
                      key={k.id}
                      karte={k}
                      objekt={objekte.find((o) => o.id === k.objektId)}
                      haengt={zieht === k.id}
                      beiKlick={() => oeffnen(k.id)}
                      beiAnfassen={() => setZieht(k.id)}
                      beiLoslassen={() => {
                        setZieht(null);
                        setUeber(null);
                      }}
                    />
                  ))}
                </ul>
                {s.id === "posteingang" && (
                  <p
                    className={cn(
                      "mx-2 mb-2 rounded-lg border border-dashed px-3 py-3 text-center text-[0.66rem]",
                      hier ? "border-tinte text-tinte" : "border-linie-stark text-grau",
                    )}
                  >
                    Dateien hierher ziehen — je Datei eine Karte
                  </p>
                )}
              </section>
            );
          })}

          {/* Weiterleitungen: übereinander in einer schmalen Spalte, farbig,
              nur zum Ablegen — so passt das ganze Board auf den Schirm. */}
          <div className="flex w-36 shrink-0 flex-col gap-2 self-stretch">
            {WEITERLEITUNGEN.map((w) => (
              <section
                key={w.id}
                {...ziel(w.id)}
                onDrop={(e) => ablegen(e, w.id)}
                className="flex min-h-[6.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-3 text-center transition-colors duration-150"
                style={{
                  borderColor: ueber === w.id ? w.tief : w.farbe,
                  background: ueber === w.id ? w.farbe : w.weich,
                  color: ueber === w.id ? "#fff" : w.tief,
                }}
              >
                <span className="text-[0.8rem] font-semibold">{w.titel}</span>
                <span className="text-[0.6rem] opacity-80">Karte hierher ziehen</span>
              </section>
            ))}
          </div>
        </div>
      </div>

      <Fenster
        offen={!!offen}
        schliessen={() => oeffnen(undefined)}
        titel={offen?.titel ?? "Karte"}
      >
        {offen && (
          <Kartenfenster
            key={offen.id}
            karte={offen}
            weiterleiten={(ziel) => setWeiter({ id: offen.id, ziel })}
            schliessen={() => oeffnen(undefined)}
          />
        )}
      </Fenster>

      {weiter && (
        <Weiterleitendialog id={weiter.id} ziel={weiter.ziel} schliessen={() => setWeiter(null)} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Karte im Board                                                       */
/* ------------------------------------------------------------------ */

function Kartenkachel({
  karte: k,
  objekt,
  haengt,
  beiKlick,
  beiAnfassen,
  beiLoslassen,
}: {
  karte: Backofficekarte;
  objekt: Objekt | undefined;
  haengt: boolean;
  beiKlick: () => void;
  beiAnfassen: () => void;
  beiLoslassen: () => void;
}) {
  const bild = k.datei?.vorschau && k.datei.typ.startsWith("image/");
  const erledigt = k.checkliste.filter((c) => c.erledigt).length;
  return (
    <li
      draggable
      onDragStart={beiAnfassen}
      onDragEnd={beiLoslassen}
      className={cn(
        "eintritt overflow-hidden rounded-xl border border-linie bg-flaeche shadow-karte",
        haengt && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={beiKlick}
        className="block w-full cursor-grab text-left active:cursor-grabbing"
      >
        {bild ? (
          <img src={k.datei!.vorschau!} alt="" className="h-20 w-full object-cover" />
        ) : k.datei ? (
          <span className="flex items-center gap-2 bg-flaeche-hoch px-3 py-2 text-[0.64rem] text-grau">
            <FileText size={13} className="shrink-0" />
            <span className="truncate">{k.datei.name}</span>
          </span>
        ) : null}
        <span className="block px-3 pt-2.5 pb-1 text-[0.78rem] font-semibold leading-snug text-tinte">
          {k.titel}
        </span>
        <span className="flex flex-wrap items-center gap-1 px-3 pb-2.5">
          <span className="rounded-full bg-flaeche-hoch px-2 py-0.5 text-[0.58rem] font-semibold text-grau-stark">
            {KARTENARTEN[k.art]}
          </span>
          {objekt && (
            <span className="rounded-full bg-[#E2EFE9] px-2 py-0.5 text-[0.58rem] font-semibold text-[#2D5646]">
              {objekt.kuerzel ?? objekt.strasse}
            </span>
          )}
          {k.gesellschaft && <span className="text-[0.58rem] text-grau">{k.gesellschaft}</span>}
          {k.faelligAm && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[0.6rem]",
                istUeberfaellig(k) ? "font-semibold text-[#9A2727]" : "text-grau",
              )}
            >
              <CalendarClock size={10} />
              {f.datum(k.faelligAm)}
            </span>
          )}
          {k.checkliste.length > 0 && (
            <span className="flex items-center gap-0.5 text-[0.6rem] text-grau">
              <CheckSquare size={10} />
              {erledigt}/{k.checkliste.length}
            </span>
          )}
          {k.uebergabe?.status === "wartet" && (
            <span className="rounded-full bg-[#FBEBD1] px-2 py-0.5 text-[0.58rem] font-semibold text-[#8A5A08]">
              wartet auf Übergabe
            </span>
          )}
        </span>
        <span className="zahl block border-t border-linie px-3 py-1.5 text-[0.6rem] text-grau">
          {KARTENQUELLEN[k.quelle]} · {f.datum(k.eingangAm)}
        </span>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Weiterleiten                                                         */
/* ------------------------------------------------------------------ */

function Weiterleitendialog({
  id,
  ziel,
  schliessen,
}: {
  id: string;
  ziel: Weiterleitung;
  schliessen: () => void;
}) {
  const { karten, weiterleiten, aendern } = useBackoffice();
  const { objekte, dokumenteAnhaengen } = useObjekte();
  const k = karten.find((x) => x.id === id)!;
  const w = WEITERLEITUNGEN.find((x) => x.id === ziel)!;

  const [objektId, setObjektId] = useState(k.objektId ?? "");
  const [suche, setSuche] = useState("");
  const objekt = objekte.find((o) => o.id === objektId);
  const dateiname = k.datei?.name ?? `${k.titel}.pdf`;
  const [ordner, setOrdner] = useState(() => ordnerVorschlag(dateiname));
  const [gesellschaft, setGesellschaft] = useState(k.gesellschaft ?? "Revest Projekt");
  const [ablageOrdner, setAblageOrdner] = useState<string>(ablageOrdnerVorschlag(k.art));

  const treffer = objekte.filter((o) =>
    objektTitel(o).toLowerCase().includes(suche.trim().toLowerCase()),
  );
  const feld =
    "h-9 w-full rounded-xl border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";

  function bestaetigen() {
    if (ziel === "qonto") {
      weiterleiten(id, "qonto", objekt?.kuerzel ? `Label ${objekt.kuerzel}` : "");
    } else if (ziel === "projekt") {
      if (!objekt) return;
      // Im Projekt in den gewählten Ordner, im Ankauf unsortiert in die Dateien.
      const zielordner = objekt.stufe === "angekauft" ? ordner : UNSORTIERT;
      dokumenteAnhaengen(objekt.id, [
        { name: dateiname, ordner: zielordner, groesseKb: k.datei?.groesseKb ?? 1 },
      ]);
      aendern(id, { objektId: objekt.id });
      const ordnerTitel =
        DOKUMENT_ORDNER.find((o) => o.schluessel === zielordner)?.titel ?? "Dateien";
      weiterleiten(id, "projekt", `${objektTitel(objekt)} / ${ordnerTitel}`);
    } else {
      aendern(id, { gesellschaft });
      weiterleiten(id, "ablage", `${gesellschaft} / ${ablageOrdner}`);
    }
    schliessen();
  }

  return (
    <Dialog titel={w.titel} unterzeile={k.titel} schliessen={schliessen}>
      <div className="flex flex-col gap-3">
        {ziel === "qonto" && (
          <>
            <p className="text-[0.76rem] leading-relaxed text-grau-stark">
              Die Rechnung geht als Beleg an Qonto. Bis Phase 2 wird das nur vermerkt — die Karte
              zeigt „wartet auf Übergabe“.
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="mini-label">Objektkürzel als Label (optional)</span>
              <select
                value={objektId}
                onChange={(e) => setObjektId(e.target.value)}
                className={feld}
              >
                <option value="">— ohne —</option>
                {objekte
                  .filter((o) => o.kuerzel)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {objektTitel(o)}
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}

        {ziel === "projekt" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="mini-label">Objekt (Kürzel oder Adresse)</span>
              <input
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Suchen …"
                aria-label="Objekt suchen"
                className={feld}
              />
            </label>
            <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
              {treffer.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setObjektId(o.id)}
                  aria-pressed={o.id === objektId}
                  className={cn(
                    "druckbar rounded-lg border px-3 py-2 text-left text-[0.76rem]",
                    o.id === objektId
                      ? "border-tinte bg-flaeche-hoch text-tinte"
                      : "border-linie text-grau-stark",
                  )}
                >
                  {objektTitel(o)}
                </button>
              ))}
            </div>
            {objekt?.stufe === "angekauft" ? (
              <label className="flex flex-col gap-1.5">
                <span className="mini-label">Zielordner (Vorschlag nach Dokumentart)</span>
                <select value={ordner} onChange={(e) => setOrdner(e.target.value)} className={feld}>
                  {DOKUMENT_ORDNER.map((o) => (
                    <option key={o.schluessel} value={o.schluessel}>
                      {"   ".repeat(o.tiefe)}
                      {o.nummer} · {o.titel}
                    </option>
                  ))}
                </select>
              </label>
            ) : objekt ? (
              <p className="text-[0.7rem] text-grau">
                Objekt im Ankauf — die Datei landet in „Dateien“ und wird beim Kauf einsortiert.
              </p>
            ) : null}
          </>
        )}

        {ziel === "ablage" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="mini-label">Gesellschaft</span>
              <select
                value={gesellschaft}
                onChange={(e) => setGesellschaft(e.target.value)}
                className={feld}
              >
                {ABLAGE_GESELLSCHAFTEN.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="mini-label">Ordner</span>
              <select
                value={ablageOrdner}
                onChange={(e) => setAblageOrdner(e.target.value)}
                className={feld}
              >
                {ABLAGE_ORDNER.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2.5 border-t border-linie pt-4">
          <button
            type="button"
            onClick={schliessen}
            className="druckbar rounded-full px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={bestaetigen}
            disabled={ziel === "projekt" && !objekt}
            className="druckbar rounded-full px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-white disabled:opacity-30"
            style={{ background: w.tief }}
          >
            Übergeben
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Karte im Fenster                                                     */
/* ------------------------------------------------------------------ */

function Kartenfenster({
  karte: k,
  weiterleiten,
  schliessen,
}: {
  karte: Backofficekarte;
  weiterleiten: (ziel: Weiterleitung) => void;
  schliessen: () => void;
}) {
  const { aendern, verschieben, loeschen } = useBackoffice();
  const { objekte } = useObjekte();
  const { anlegen: aufgabeAnlegen } = useAufgaben();
  const { nutzer } = useAuth();
  const [punkt, setPunkt] = useState("");
  const setze = (teil: Partial<Backofficekarte>) => aendern(k.id, teil);
  const feld =
    "h-8 w-full rounded-lg border border-linie bg-flaeche px-2.5 text-[0.78rem] text-tinte focus:border-linie-stark focus:outline-none";
  const pdf = k.datei?.vorschau && k.datei.typ === "application/pdf";
  const bild = k.datei?.vorschau && k.datei.typ.startsWith("image/");

  /** Punkt 31: aus der Karte eine Aufgabe am Objekt machen. */
  function zurAufgabe() {
    if (!k.objektId) return;
    aufgabeAnlegen({
      titel: k.titel,
      beschreibung: k.notizen,
      objektId: k.objektId,
      art: k.art === "todo" ? "sonst" : "unterlagen",
      dringlichkeit: "normal",
      faelligAm: k.faelligAm,
    });
    setze({
      spalte: "erledigt",
      verlauf: [
        ...k.verlauf,
        { zeitpunkt: new Date().toISOString(), text: "In Aufgabe am Objekt umgewandelt" },
      ],
    });
  }

  return (
    <div className="grid gap-px bg-linie lg:grid-cols-[1.2fr_1fr]">
      {/* ----- Vorschau und Angaben ----- */}
      <section className="flex flex-col gap-3 bg-grund px-4 py-5 md:px-7">
        <input
          value={k.titel}
          onChange={(e) => setze({ titel: e.target.value })}
          aria-label="Titel"
          className="headline w-full bg-transparent text-[1.3rem] text-tinte focus:outline-none"
        />
        {bild && (
          <img
            src={k.datei!.vorschau!}
            alt={k.datei!.name}
            className="max-h-[26rem] w-full rounded-2xl border border-linie object-contain"
          />
        )}
        {pdf && (
          <iframe
            title={k.datei!.name}
            src={k.datei!.vorschau!}
            className="h-[26rem] w-full rounded-2xl border border-linie"
          />
        )}
        {k.datei && !k.datei.vorschau && (
          <p className="flex items-center gap-2 rounded-xl bg-flaeche-hoch px-3 py-2.5 text-[0.72rem] text-grau">
            <FileText size={14} />
            {k.datei.name} · Vorschau nur in der Sitzung, in der die Datei hochgeladen wurde (bis
            Phase 2)
          </p>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="mini-label">Art</span>
            <select
              value={k.art}
              onChange={(e) => setze({ art: e.target.value as Kartenart })}
              className={feld}
            >
              {Object.entries(KARTENARTEN).map(([w, t]) => (
                <option key={w} value={w}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="mini-label">Spalte</span>
            <select
              value={k.spalte}
              onChange={(e) => verschieben(k.id, e.target.value as Spalte)}
              className={feld}
            >
              {SPALTEN.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titel}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="mini-label">Objekt</span>
            <select
              value={k.objektId ?? ""}
              onChange={(e) => setze({ objektId: e.target.value || null })}
              className={feld}
            >
              <option value="">— keines —</option>
              {objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {objektTitel(o)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="mini-label">Gesellschaft</span>
            <select
              value={k.gesellschaft ?? ""}
              onChange={(e) => setze({ gesellschaft: e.target.value || null })}
              className={feld}
            >
              <option value="">— offen —</option>
              {ABLAGE_GESELLSCHAFTEN.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="mini-label">Fällig am</span>
            <input
              type="date"
              value={k.faelligAm ?? ""}
              onChange={(e) => setze({ faelligAm: e.target.value || null })}
              className={cn(feld, "zahl")}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="mini-label">Zugewiesen</span>
            <select
              value={k.zugewiesen ?? ""}
              onChange={(e) => setze({ zugewiesen: e.target.value || null })}
              className={feld}
            >
              <option value="">— niemand —</option>
              {nutzer && <option value={nutzer.name}>{nutzer.name}</option>}
            </select>
          </label>
        </div>
        <p className="zahl text-[0.66rem] text-grau">
          {KARTENQUELLEN[k.quelle]} · Eingang {f.datum(k.eingangAm)}
          {k.uebergabe &&
            ` · ${k.uebergabe.details || WEITERLEITUNGEN.find((w) => w.id === k.uebergabe!.ziel)?.titel} (${k.uebergabe.status === "wartet" ? "wartet auf Übergabe" : "übergeben"})`}
        </p>
      </section>

      {/* ----- Notizen, Checkliste, Aktionen ----- */}
      <section className="flex flex-col gap-4 bg-grund px-4 py-5 md:px-7">
        <div>
          <div className="mini-label">Weiterleiten</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEITERLEITUNGEN.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => weiterleiten(w.id)}
                className="druckbar rounded-full px-3.5 py-2 text-[0.68rem] font-semibold"
                style={{ background: w.weich, color: w.tief }}
              >
                {w.titel}
              </button>
            ))}
            <button
              type="button"
              onClick={zurAufgabe}
              disabled={!k.objektId}
              title={k.objektId ? "Als Aufgabe am Objekt anlegen" : "Erst ein Objekt wählen"}
              className="druckbar flex items-center gap-1.5 rounded-full border border-linie-stark px-3.5 py-2 text-[0.68rem] font-semibold text-tinte disabled:opacity-30"
            >
              <ListPlus size={12} />
              In Aufgabe umwandeln
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="mini-label">Notizen</span>
          <textarea
            rows={4}
            defaultValue={k.notizen ?? ""}
            onBlur={(e) =>
              e.target.value !== (k.notizen ?? "") &&
              setze({ notizen: e.target.value.trim() || null })
            }
            className="w-full resize-y rounded-xl border border-linie bg-flaeche px-3 py-2 text-[0.78rem] leading-relaxed text-tinte focus:border-linie-stark focus:outline-none"
          />
        </label>

        <div>
          <div className="mini-label">Checkliste</div>
          <ul className="mt-2 flex flex-col gap-1">
            {k.checkliste.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-[0.78rem]">
                <input
                  type="checkbox"
                  checked={c.erledigt}
                  onChange={() =>
                    setze({
                      checkliste: k.checkliste.map((x) =>
                        x.id === c.id ? { ...x, erledigt: !x.erledigt } : x,
                      ),
                    })
                  }
                  className="size-4 accent-[#17935C]"
                />
                <span className={cn("flex-1", c.erledigt && "text-grau line-through")}>
                  {c.text}
                </span>
                <button
                  type="button"
                  onClick={() => setze({ checkliste: k.checkliste.filter((x) => x.id !== c.id) })}
                  aria-label={`${c.text} entfernen`}
                  className="druckbar text-grau hover:text-tinte"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!punkt.trim()) return;
              setze({
                checkliste: [
                  ...k.checkliste,
                  { id: neueKartenId("c"), text: punkt.trim(), erledigt: false },
                ],
              });
              setPunkt("");
            }}
            className="mt-2"
          >
            <input
              value={punkt}
              onChange={(e) => setPunkt(e.target.value)}
              placeholder="+ Punkt hinzufügen"
              aria-label="Neuer Checklistenpunkt"
              className={feld}
            />
          </form>
        </div>

        <div>
          <div className="mini-label">Verlauf</div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {[...k.verlauf].reverse().map((v, i) => (
              <li key={i} className="text-[0.7rem] text-grau-stark">
                <span className="zahl text-grau">{f.datum(v.zeitpunkt)}</span> · {v.text}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => {
            loeschen(k.id);
            schliessen();
          }}
          className="druckbar flex w-fit items-center gap-1.5 rounded-full border border-linie px-3 py-2 text-[0.64rem] text-grau hover:text-[#9A2727]"
        >
          <Trash2 size={12} />
          Karte löschen
        </button>
      </section>
    </div>
  );
}
