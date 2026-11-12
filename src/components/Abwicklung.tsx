/**
 * Bausteine der Abwicklung nach Kauf und Verkauf (SAMMLUNG 1, 2):
 *
 * - Übergabekopf: Datum, Gesellschaft, Mail Käufer/Verkäufer, Hausverwaltung.
 *   Fehlende Pflichtangaben sind gelb.
 * - Zählerstände mit Nummer, Stand, MaLo-ID (Strom) und Foto — am Handy
 *   öffnet „Foto“ direkt die Kamera.
 * - Objektinfos: Wohnungs-, Stellplatz-, Abstellraum-Nr. und der
 *   Schlüsselbox-Code als verdecktes Feld (nur auf Klick sichtbar).
 * - Vorlage Übergabeprotokoll am Projekt.
 */
import { Camera, Download, Eye, EyeOff, FileUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  GESELLSCHAFTEN,
  ZAEHLERARTEN,
  type Objekt,
  type Objektinfos,
  type Uebergabeprotokoll,
  type Zaehler,
  type Zaehlerart,
} from "../lib/objekte";
import { useAufgaben } from "../lib/aufgabenStore";
import { useObjekte } from "../lib/objekteStore";
import { ausAnkaufUebernehmen, mitProtokoll, protokollVon, zaehlerHinweis } from "../lib/uebergabe";
import { fehlendeAngaben, type Objektgruppe, type Uebergabeangaben } from "../lib/ummeldungen";
import { cn } from "../lib/utils";

const FELD =
  "w-full rounded-lg border border-linie bg-grund px-2.5 py-1.5 text-[0.72rem] text-grau-stark placeholder:text-grau focus:border-linie-stark focus:outline-none";

/** Vorschauen von Fotos und Vorlage — nur in dieser Sitzung (bis Phase 2). */
const VORSCHAU = new Map<string, string>();

function Beschriftet({
  titel,
  fehlt,
  children,
}: {
  titel: string;
  fehlt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span
        className={cn(
          "text-[0.58rem] tracking-[0.12em] uppercase",
          fehlt ? "font-semibold text-[#8A5608]" : "text-grau",
        )}
      >
        {titel}
        {fehlt ? " · fehlt" : ""}
      </span>
      {children}
    </label>
  );
}

/** Text, der beim Verlassen speichert — kein Stand je Buchstabe. */
function Textfeld({
  wert,
  setWert,
  label,
  platzhalter,
  typ = "text",
  fehlt,
}: {
  wert: string | null | undefined;
  setWert: (v: string | null) => void;
  label: string;
  platzhalter?: string;
  typ?: "text" | "email" | "date";
  fehlt?: boolean;
}) {
  const [text, setText] = useState(wert ?? "");
  return (
    <input
      type={typ}
      value={typ === "date" ? (wert ?? "") : text}
      onChange={(e) => (typ === "date" ? setWert(e.target.value || null) : setText(e.target.value))}
      onBlur={() => typ !== "date" && text !== (wert ?? "") && setWert(text.trim() || null)}
      placeholder={platzhalter}
      aria-label={label}
      className={cn(FELD, typ === "date" && "zahl", fehlt && "border-[#EFD9A6] bg-[#FDF8EC]")}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Übergabekopf                                                         */
/* ------------------------------------------------------------------ */

export function Uebergabekopf({
  titel,
  angaben,
  gruppe,
  setze,
  hausverwaltungen,
  emailTitel,
}: {
  titel: string;
  angaben: Uebergabeangaben;
  gruppe: Objektgruppe;
  setze: (teil: Partial<Uebergabeangaben>) => void;
  /** Vorschläge aus den Kontakten des Objekts (Rolle Verwalter). */
  hausverwaltungen: string[];
  emailTitel: string;
}) {
  const fehlt = new Set(fehlendeAngaben(angaben, gruppe));
  return (
    <div className="rounded-2xl border border-linie bg-flaeche px-4 py-3.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <div className="mini-label">{titel}</div>
        {fehlt.size > 0 && (
          <span className="text-[0.64rem] font-semibold text-[#8A5608]">
            {fehlt.size} Angabe{fehlt.size === 1 ? "" : "n"} fehlt
          </span>
        )}
      </div>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Beschriftet titel="Übergabedatum" fehlt={fehlt.has("Übergabedatum")}>
          <Textfeld
            typ="date"
            label="Übergabedatum"
            wert={angaben.datum}
            setWert={(v) => setze({ datum: v })}
            fehlt={fehlt.has("Übergabedatum")}
          />
        </Beschriftet>
        <Beschriftet titel="Gesellschaft" fehlt={fehlt.has("Gesellschaft")}>
          <select
            value={angaben.gesellschaft ?? ""}
            onChange={(e) => setze({ gesellschaft: e.target.value || null })}
            aria-label="Gesellschaft"
            className={cn(FELD, fehlt.has("Gesellschaft") && "border-[#EFD9A6] bg-[#FDF8EC]")}
          >
            <option value="">— wählen —</option>
            {Object.entries(GESELLSCHAFTEN).map(([w, t]) => (
              <option key={w} value={w}>
                {t}
              </option>
            ))}
          </select>
        </Beschriftet>
        <Beschriftet titel={emailTitel} fehlt={fehlt.has("E-Mail")}>
          <Textfeld
            typ="email"
            label={emailTitel}
            wert={angaben.email}
            setWert={(v) => setze({ email: v })}
            platzhalter="name@beispiel.de"
            fehlt={fehlt.has("E-Mail")}
          />
        </Beschriftet>
        <Beschriftet
          titel={gruppe === "etw" ? "Hausverwaltung" : "Hausverwaltung (optional)"}
          fehlt={fehlt.has("Hausverwaltung")}
        >
          <input
            list="hausverwaltungen"
            defaultValue={angaben.hausverwaltung ?? ""}
            onBlur={(e) => setze({ hausverwaltung: e.target.value.trim() || null })}
            aria-label="Hausverwaltung"
            className={cn(FELD, fehlt.has("Hausverwaltung") && "border-[#EFD9A6] bg-[#FDF8EC]")}
          />
          <datalist id="hausverwaltungen">
            {hausverwaltungen.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </Beschriftet>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Zählerstände                                                         */
/* ------------------------------------------------------------------ */

let zaehlerNr = 0;
const neueZaehlerId = () => `z-${Date.now().toString(36)}-${(zaehlerNr += 1)}`;

export function Zaehlerstaende({
  objekt,
  richtung,
  einheitId,
}: {
  objekt: Objekt;
  richtung: "an" | "ab";
  einheitId: string | null;
}) {
  const { aendern } = useObjekte();
  const alle = objekt.zaehler ?? [];
  const liste = alle.filter((z) => z.richtung === richtung && (z.einheitId ?? null) === einheitId);
  const [, neuZeichnen] = useState(0);

  const speichern = (neu: Zaehler[]) =>
    aendern(objekt.id, {
      zaehler: [
        ...alle.filter((z) => !(z.richtung === richtung && (z.einheitId ?? null) === einheitId)),
        ...neu,
      ],
    });
  const setze = (id: string, teil: Partial<Zaehler>) =>
    speichern(liste.map((z) => (z.id === id ? { ...z, ...teil } : z)));

  function hinzufuegen(art: Zaehlerart) {
    speichern([
      ...liste,
      {
        id: neueZaehlerId(),
        art,
        nummer: null,
        stand: null,
        datum: new Date().toISOString().slice(0, 10),
        maloId: null,
        foto: null,
        richtung,
        einheitId,
      },
    ]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="mini-label">Zählerstände</div>
        <div className="ml-auto flex flex-wrap gap-1">
          {(["strom", "gas", "wasser_kalt", "wasser_warm", "heizung"] as Zaehlerart[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => hinzufuegen(a)}
              className="druckbar flex items-center gap-1 rounded-full border border-linie px-2.5 py-1 text-[0.62rem] font-semibold text-grau-stark hover:text-tinte"
            >
              <Plus size={10} />
              {ZAEHLERARTEN[a]}
            </button>
          ))}
        </div>
      </div>
      {liste.length === 0 ? (
        <p className="mt-2 text-[0.68rem] text-grau">Noch kein Zähler erfasst.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {liste.map((z) => {
            const vorschau = VORSCHAU.get(z.id);
            const hinweis = zaehlerHinweis(z);
            return (
              <li key={z.id} className="rounded-xl border border-linie bg-flaeche px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.74rem] font-semibold text-tinte">
                    {ZAEHLERARTEN[z.art]}
                  </span>
                  {hinweis && (
                    <span className="text-[0.62rem] font-semibold text-[#8A5608]">{hinweis}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => speichern(liste.filter((x) => x.id !== z.id))}
                    aria-label={`${ZAEHLERARTEN[z.art]} entfernen`}
                    className="druckbar ml-auto flex size-6 items-center justify-center rounded-full text-grau hover:text-[#9A2727]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div
                  className={cn(
                    "mt-2 grid gap-2",
                    z.art === "strom"
                      ? "sm:grid-cols-[1fr_1fr_1fr_1.2fr_auto]"
                      : "sm:grid-cols-[1fr_1fr_1fr_auto]",
                  )}
                >
                  <Textfeld
                    label="Zählernummer"
                    platzhalter="Zählernummer"
                    wert={z.nummer}
                    setWert={(v) => setze(z.id, { nummer: v })}
                  />
                  <Textfeld
                    label="Stand"
                    platzhalter="Stand"
                    wert={z.stand}
                    setWert={(v) => setze(z.id, { stand: v })}
                  />
                  <Textfeld
                    typ="date"
                    label="Datum"
                    wert={z.datum}
                    setWert={(v) => setze(z.id, { datum: v })}
                  />
                  {z.art === "strom" && (
                    <Textfeld
                      label="MaLo-ID"
                      platzhalter="MaLo-ID"
                      wert={z.maloId}
                      setWert={(v) => setze(z.id, { maloId: v })}
                    />
                  )}
                  <label className="druckbar flex cursor-pointer items-center gap-1.5 rounded-lg border border-linie px-2.5 py-1.5 text-[0.68rem] font-semibold text-grau-stark hover:text-tinte">
                    <Camera size={12} />
                    {z.foto ? "Neues Foto" : "Foto"}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const d = e.target.files?.[0];
                        if (!d) return;
                        VORSCHAU.set(z.id, URL.createObjectURL(d));
                        setze(z.id, { foto: { name: d.name } });
                        neuZeichnen((n) => n + 1);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {z.foto && (
                  <div className="mt-2 flex items-center gap-2 text-[0.64rem] text-grau">
                    {vorschau ? (
                      <img
                        src={vorschau}
                        alt={`Zähler ${ZAEHLERARTEN[z.art]}`}
                        className="h-14 rounded-md border border-linie object-cover"
                      />
                    ) : null}
                    {z.foto.name}
                    {!vorschau && " (Vorschau nur in der Sitzung des Uploads, bis Phase 2)"}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Objektinfos mit verdecktem Schlüsselbox-Code                         */
/* ------------------------------------------------------------------ */

export function Objektinfofelder({
  infos,
  setze,
}: {
  infos: Objektinfos | undefined;
  setze: (teil: Partial<Objektinfos>) => void;
}) {
  const i = infos ?? {};
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <Beschriftet titel="Wohnungs-Nr.">
        <Textfeld
          label="Wohnungs-Nr."
          wert={i.wohnungsNr}
          setWert={(v) => setze({ wohnungsNr: v })}
        />
      </Beschriftet>
      <Beschriftet titel="TG-Stellplatz-Nr.">
        <Textfeld
          label="TG-Stellplatz-Nr."
          wert={i.stellplatzNr}
          setWert={(v) => setze({ stellplatzNr: v })}
        />
      </Beschriftet>
      <Beschriftet titel="Abstellraum-Nr.">
        <Textfeld
          label="Abstellraum-Nr."
          wert={i.abstellraumNr}
          setWert={(v) => setze({ abstellraumNr: v })}
        />
      </Beschriftet>
      <Beschriftet titel="Schlüsselbox-Code">
        <VerdecktesFeld
          wert={i.schluesselboxCode}
          setWert={(v) => setze({ schluesselboxCode: v })}
        />
      </Beschriftet>
    </div>
  );
}

/**
 * Verdeckt, bis man klickt. Kein Verlaufseintrag, keine Anzeige in Listen —
 * der Code gehört nur hierher.
 */
export function VerdecktesFeld({
  wert,
  setWert,
}: {
  wert: string | null | undefined;
  setWert: (v: string | null) => void;
}) {
  const [zeigen, setZeigen] = useState(false);
  const [text, setText] = useState(wert ?? "");
  return (
    <span className="flex gap-1">
      <input
        type={zeigen ? "text" : "password"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== (wert ?? "")) setWert(text.trim() || null);
          setZeigen(false);
        }}
        autoComplete="off"
        placeholder={wert ? "••••" : "—"}
        aria-label="Schlüsselbox-Code"
        className={cn(FELD, "zahl")}
      />
      <button
        type="button"
        onClick={() => setZeigen((z) => !z)}
        aria-label={zeigen ? "Code verbergen" : "Code anzeigen"}
        title={zeigen ? "Verbergen" : "Anzeigen"}
        className="druckbar flex size-8 shrink-0 items-center justify-center rounded-lg border border-linie text-grau-stark hover:text-tinte"
      >
        {zeigen ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Vorlage Übergabeprotokoll                                            */
/* ------------------------------------------------------------------ */

export function Protokollvorlage({ objekt }: { objekt: Objekt }) {
  const { aendern } = useObjekte();
  const v = objekt.uebergabeVorlage ?? null;
  const [, neuZeichnen] = useState(0);
  const link = VORSCHAU.get(`vorlage-${objekt.id}`);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-linie-stark px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="mini-label">Vorlage Übergabeprotokoll</div>
        <div className="mt-0.5 truncate text-[0.72rem] text-grau-stark">
          {v ? v.name : "Noch keine Vorlage hinterlegt (xlsx oder pdf)."}
        </div>
      </div>
      {v && link && (
        <a
          href={link}
          download={v.name}
          className="druckbar flex items-center gap-1.5 rounded-full border border-linie-stark px-3 py-1.5 text-[0.66rem] font-semibold text-tinte"
        >
          <Download size={12} />
          Vorlage herunterladen
        </a>
      )}
      {v && !link && (
        <span className="text-[0.64rem] text-grau">Download nach Phase 2 aus dem Drive</span>
      )}
      <label className="druckbar flex cursor-pointer items-center gap-1.5 rounded-full bg-tinte px-3 py-1.5 text-[0.66rem] font-semibold text-grund">
        <FileUp size={12} />
        {v ? "Ersetzen" : "Vorlage hinterlegen"}
        <input
          type="file"
          accept=".xlsx,.xls,.pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const d = e.target.files?.[0];
            if (!d) return;
            VORSCHAU.set(`vorlage-${objekt.id}`, URL.createObjectURL(d));
            aendern(objekt.id, {
              uebergabeVorlage: { name: d.name, groesseKb: Math.max(1, Math.round(d.size / 1024)) },
            });
            neuZeichnen((n) => n + 1);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Übergabeprotokoll (Block O)                                          */
/* ------------------------------------------------------------------ */

/**
 * PDF aus der Handy-App plus Kerndaten: Anwesende, Schlüssel, Mängel,
 * Bemerkungen. Zähler stehen darunter (eine Liste für Protokoll und
 * Ab-/Ummeldungen). Offene Mängel werden mit einem Klick zur Aufgabe.
 */
export function Protokollfeld({
  objekt,
  richtung,
  einheitId,
}: {
  objekt: Objekt;
  richtung: "an" | "ab";
  einheitId: string | null;
}) {
  const { aendern } = useObjekte();
  const { anlegen } = useAufgaben();
  const p = protokollVon(objekt, richtung, einheitId);
  const [, neuZeichnen] = useState(0);
  const [person, setPerson] = useState("");
  const [mangel, setMangel] = useState("");
  const setze = (teil: Partial<Uebergabeprotokoll>) =>
    aendern(objekt.id, { uebergaben: mitProtokoll(objekt, { ...p, ...teil }) });
  const vorschau = VORSCHAU.get(`pdf-${p.id}`);
  const vorschlaege = objekt.kontakte.map((k) => k.name).filter(Boolean);
  const neueId = (x: string) =>
    `${x}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const hatAnkauf = richtung === "ab" && (objekt.zaehler ?? []).some((z) => z.richtung === "an");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-linie bg-flaeche px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mini-label">Übergabeprotokoll</div>
        {richtung === "ab" && einheitId && hatAnkauf && (
          <button
            type="button"
            onClick={() => aendern(objekt.id, ausAnkaufUebernehmen(objekt, einheitId))}
            className="druckbar rounded-full border border-linie-stark px-3 py-1 text-[0.64rem] font-semibold text-tinte"
          >
            Zähler und Schlüssel aus dem Ankauf übernehmen
          </button>
        )}
        <label className="druckbar ml-auto flex cursor-pointer items-center gap-1.5 rounded-full bg-tinte px-3 py-1 text-[0.64rem] font-semibold text-grund">
          <FileUp size={11} />
          {p.pdf ? "PDF ersetzen" : "Protokoll-PDF hochladen"}
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const d = e.target.files?.[0];
              if (!d) return;
              VORSCHAU.set(`pdf-${p.id}`, URL.createObjectURL(d));
              setze({ pdf: { name: d.name } });
              neuZeichnen((n) => n + 1);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {p.pdf && (
        <div className="text-[0.68rem] text-grau-stark">
          {vorschau ? (
            <a href={vorschau} target="_blank" rel="noreferrer" className="underline">
              {p.pdf.name}
            </a>
          ) : (
            <>{p.pdf.name} (Vorschau nur in der Sitzung des Uploads, bis Phase 2)</>
          )}
          <span className="ml-2 text-grau">
            Phase 2: KI liest das PDF aus und füllt die Felder vor.
          </span>
        </div>
      )}

      {/* ----- Anwesende ----- */}
      <div>
        <span className="text-[0.58rem] tracking-[0.12em] uppercase text-grau">Anwesende</span>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {p.anwesende.map((a) => (
            <span
              key={a}
              className="flex items-center gap-1 rounded-full bg-flaeche-hoch px-2.5 py-0.5 text-[0.7rem] text-tinte"
            >
              {a}
              <button
                type="button"
                onClick={() => setze({ anwesende: p.anwesende.filter((x) => x !== a) })}
                aria-label={`${a} entfernen`}
                className="text-grau hover:text-[#9A2727]"
              >
                ×
              </button>
            </span>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!person.trim() || p.anwesende.includes(person.trim())) return;
              setze({ anwesende: [...p.anwesende, person.trim()] });
              setPerson("");
            }}
          >
            <input
              list={`anwesende-${p.id}`}
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="+ Person"
              aria-label="Anwesende Person hinzufügen"
              className="w-40 rounded-full border border-linie bg-grund px-2.5 py-0.5 text-[0.7rem]"
            />
            <datalist id={`anwesende-${p.id}`}>
              {vorschlaege.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </form>
        </div>
      </div>

      {/* ----- Schlüssel ----- */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[0.58rem] tracking-[0.12em] uppercase text-grau">Schlüssel</span>
          <button
            type="button"
            onClick={() =>
              setze({
                schluessel: [
                  ...p.schluessel,
                  { id: neueId("s"), art: "", anzahl: null, bemerkung: null },
                ],
              })
            }
            className="flex items-center gap-1 text-[0.62rem] font-semibold text-grau-stark hover:text-tinte"
          >
            <Plus size={10} /> Schlüssel
          </button>
        </div>
        {p.schluessel.map((s) => (
          <div key={s.id} className="mt-1 grid grid-cols-[1fr_5rem_1.5fr_auto] gap-1.5">
            <Textfeld
              label="Art"
              platzhalter="z. B. Wohnung, Haustür, Briefkasten"
              wert={s.art}
              setWert={(v) =>
                setze({
                  schluessel: p.schluessel.map((x) => (x.id === s.id ? { ...x, art: v ?? "" } : x)),
                })
              }
            />
            <Textfeld
              label="Anzahl"
              platzhalter="Anzahl"
              wert={s.anzahl !== null ? String(s.anzahl) : null}
              setWert={(v) =>
                setze({
                  schluessel: p.schluessel.map((x) =>
                    x.id === s.id ? { ...x, anzahl: v ? Number(v) || null : null } : x,
                  ),
                })
              }
            />
            <Textfeld
              label="Bemerkung"
              platzhalter="Bemerkung"
              wert={s.bemerkung}
              setWert={(v) =>
                setze({
                  schluessel: p.schluessel.map((x) => (x.id === s.id ? { ...x, bemerkung: v } : x)),
                })
              }
            />
            <button
              type="button"
              onClick={() => setze({ schluessel: p.schluessel.filter((x) => x.id !== s.id) })}
              aria-label="Schlüssel entfernen"
              className="druckbar flex size-7 items-center justify-center rounded-full text-grau hover:text-[#9A2727]"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* ----- Mängel ----- */}
      <div>
        <span className="text-[0.58rem] tracking-[0.12em] uppercase text-grau">
          Bemerkungen / Mängel
        </span>
        <ul className="mt-1 flex flex-col gap-1">
          {p.maengel.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 text-[0.74rem]">
              <label className="flex items-center gap-1 text-[0.64rem] text-grau">
                <input
                  type="checkbox"
                  checked={m.offen}
                  onChange={(e) =>
                    setze({
                      maengel: p.maengel.map((x) =>
                        x.id === m.id ? { ...x, offen: e.target.checked } : x,
                      ),
                    })
                  }
                />
                offen
              </label>
              <span
                className={cn("min-w-0 flex-1", m.offen ? "text-tinte" : "text-grau line-through")}
              >
                {m.text}
              </span>
              {m.aufgabeId ? (
                <span className="text-[0.62rem] text-[#0C5E3A]">Aufgabe angelegt</span>
              ) : (
                m.offen && (
                  <button
                    type="button"
                    onClick={() => {
                      const a = anlegen({
                        titel: `Mangel: ${m.text}`,
                        beschreibung: `Aus dem Übergabeprotokoll${richtung === "ab" ? " (Verkauf)" : " (Ankauf)"}`,
                        objektId: objekt.id,
                        art: "sonst",
                        dringlichkeit: "normal",
                        faelligAm: new Date(Date.now() + 7 * 86_400_000).toISOString(),
                      });
                      setze({
                        maengel: p.maengel.map((x) =>
                          x.id === m.id ? { ...x, aufgabeId: a.id } : x,
                        ),
                      });
                    }}
                    className="druckbar rounded-full border border-linie-stark px-2 py-0.5 text-[0.62rem] font-semibold text-tinte"
                  >
                    → Aufgabe
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!mangel.trim()) return;
            setze({
              maengel: [
                ...p.maengel,
                { id: neueId("m"), text: mangel.trim(), offen: true, aufgabeId: null },
              ],
            });
            setMangel("");
          }}
          className="mt-1"
        >
          <input
            value={mangel}
            onChange={(e) => setMangel(e.target.value)}
            placeholder="+ Mangel oder Bemerkung (Enter)"
            aria-label="Mangel hinzufügen"
            className={FELD}
          />
        </form>
      </div>
    </div>
  );
}
