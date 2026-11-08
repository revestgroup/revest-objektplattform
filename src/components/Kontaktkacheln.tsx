/**
 * Kontakte eines Objekts als kleine Kacheln — nach `docs/planung/entwurf_kontakte.dc.html`.
 *
 * Alles auf einer Seite: Name, Rolle, Telefon und E-Mail antippbar, die Notiz
 * auf zwei Zeilen. Bearbeitet und angelegt wird direkt in der Kachel, ohne
 * eigenes Fenster — eine Nummer, die man beim Telefonieren notiert, braucht
 * keinen Umweg.
 *
 * Die eine Mahnung bleibt: ein abgesagtes Objekt ohne Eigentümer ist ein
 * verlorener Vorgang. Der Kontakt war das Ergebnis, nicht der Kauf.
 */
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, BookUser, Link2, Mail, Pencil, Phone, Plus, X } from "lucide-react";
import { useState } from "react";

import { anzeigename, nameZerlegen, sucheKontakte, type Kontaktdatensatz } from "../lib/kontakte";
import {
  KONTAKTROLLEN,
  KONTAKTROLLEN_REIHENFOLGE,
  STUFEN,
  type Kontakt,
  type Kontaktrolle,
  type Objekt,
} from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";

let zaehler = 0;
function neueId() {
  zaehler += 1;
  return `kon-${Date.now().toString(36)}-${zaehler}`;
}

/** Makler zuerst, dann Eigentümer — in der Reihenfolge, in der man anruft. */
const FOLGE: Kontaktrolle[] = [
  "makler",
  "eigentuemer",
  "verwalter",
  "notar",
  "handwerker",
  "sonst",
];

const FELD =
  "h-[30px] w-full rounded-lg border border-linie bg-flaeche px-2.5 text-[0.78rem] text-tinte placeholder:text-grau focus:border-tinte focus:outline-none";

export function Kontaktkacheln({
  objekt,
  einspaltig,
}: {
  objekt: Objekt;
  /** In der Übersicht: dieselben Kacheln, untereinander. */
  einspaltig?: boolean;
}) {
  const { objekte, aendern, register, kontaktSpeichern, kontaktVerknuepfen } = useObjekte();
  const navigate = useNavigate();
  const [offen, setOffen] = useState<string | "neu" | null>(null);

  const kontakte = [...objekt.kontakte]
    .filter((k) => k.name.trim() !== "")
    .sort((a, b) => FOLGE.indexOf(a.rolle) - FOLGE.indexOf(b.rolle));

  const eigentuemer = kontakte.find((k) => k.rolle === "eigentuemer") ?? null;
  // Derselbe Eigentümer an anderer Stelle: der Grund, warum diese Angaben
  // überhaupt gepflegt werden.
  const weitere = eigentuemer
    ? objekte.filter(
        (o) =>
          o.id !== objekt.id &&
          o.kontakte.some(
            (k) =>
              k.rolle === "eigentuemer" &&
              k.name.trim().toLowerCase() === eigentuemer.name.trim().toLowerCase(),
          ),
      )
    : [];

  function speichern(k: Kontakt) {
    // Stammdaten gehören ins Register — von dort ziehen alle Objekte nach.
    // Rolle und Notiz bleiben am Objekt.
    const r = k.kontaktId ? register.find((x) => x.id === k.kontaktId) : undefined;
    if (r) kontaktSpeichern({ ...r, ...nameZerlegen(k.name), telefon: k.telefon, email: k.email });
    const liste = objekt.kontakte.some((x) => x.id === k.id)
      ? objekt.kontakte.map((x) => (x.id === k.id ? k : x))
      : [...objekt.kontakte, k];
    aendern(objekt.id, { kontakte: liste }, "Kontakte gepflegt");
    setOffen(null);
  }

  function entfernen(id: string) {
    aendern(
      objekt.id,
      { kontakte: objekt.kontakte.filter((k) => k.id !== id) },
      "Kontakte gepflegt",
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {objekt.stufe === "abgesagt" && !eigentuemer && (
        <p className="flex items-center gap-2 rounded-xl border border-linie bg-flaeche-hoch px-3 py-2 text-[0.74rem] text-tinte">
          <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
          Abgesagt, aber kein Eigentümer hinterlegt.
        </p>
      )}

      <div
        className={cn(
          "grid gap-2.5",
          einspaltig ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]",
        )}
      >
        {kontakte.map((k) =>
          offen === k.id ? (
            <Kontaktformular
              key={k.id}
              start={k}
              speichern={speichern}
              abbrechen={() => setOffen(null)}
            />
          ) : (
            <Kachel
              key={k.id}
              k={k}
              bearbeiten={() => setOffen(k.id)}
              entfernen={() => entfernen(k.id)}
              imRegister={
                k.kontaktId
                  ? () => void navigate({ to: "/kontakte", search: { kontakt: k.kontaktId! } })
                  : undefined
              }
            />
          ),
        )}

        {offen === "neu" ? (
          <Kontaktformular
            start={{
              id: neueId(),
              rolle: "makler",
              name: "",
              telefon: null,
              email: null,
              notiz: null,
            }}
            speichern={speichern}
            abbrechen={() => setOffen(null)}
            // Erst im Register suchen: der Makler mit zwölf Objekten soll
            // nicht zum dreizehnten Mal angelegt werden.
            treffer={(name) =>
              sucheKontakte(register, name)
                .filter((r) => !objekt.kontakte.some((x) => x.kontaktId === r.id))
                .slice(0, 5)
            }
            verknuepfen={(kontaktId, rolle) => {
              kontaktVerknuepfen(objekt.id, kontaktId, rolle);
              setOffen(null);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setOffen("neu")}
            className="druckbar flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-linie-stark text-[0.8rem] font-semibold text-grau-stark hover:text-tinte"
          >
            <Plus size={20} strokeWidth={1.75} />
            Kontakt hinzufügen
          </button>
        )}
      </div>

      {weitere.length > 0 && (
        <div className="text-[0.7rem] text-grau">
          <span className="mini-label">Derselbe Eigentümer</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {weitere.map((o) => (
              <span
                key={o.id}
                className="flex items-center gap-1.5 rounded-full bg-flaeche-hoch px-2.5 py-1"
              >
                <span
                  aria-hidden
                  className="size-[6px] rounded-full"
                  style={{ background: STUFEN[o.stufe].farbe }}
                />
                {o.bezeichnung?.trim() || o.strasse} · {STUFEN[o.stufe].titel}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Kachel({
  k,
  bearbeiten,
  entfernen,
  imRegister,
}: {
  k: Kontakt;
  bearbeiten: () => void;
  entfernen: () => void;
  imRegister?: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[14px] border border-linie bg-flaeche px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span title={k.name} className="min-w-0 truncate text-[0.86rem] font-semibold text-tinte">
          {k.name}
        </span>
        <span className="shrink-0 rounded-full bg-flaeche-hoch px-2 py-0.5 text-[0.54rem] font-semibold tracking-[0.14em] uppercase text-grau-stark">
          {KONTAKTROLLEN[k.rolle]}
        </span>
      </div>
      {k.telefon && (
        <a
          href={`tel:${k.telefon.replace(/\s+/g, "")}`}
          className="flex min-w-0 items-center gap-1.5 text-[0.74rem] text-grau-stark hover:text-tinte"
        >
          <Phone size={12} strokeWidth={1.75} className="shrink-0" />
          <span className="zahl truncate">{k.telefon}</span>
        </a>
      )}
      {k.email && (
        <a
          href={`mailto:${k.email}`}
          className="flex min-w-0 items-center gap-1.5 text-[0.74rem] text-grau-stark hover:text-tinte"
        >
          <Mail size={12} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">{k.email}</span>
        </a>
      )}
      {k.notiz && <p className="line-clamp-2 text-[0.72rem] leading-snug text-grau">{k.notiz}</p>}
      <div className="mt-auto flex gap-1.5 pt-1">
        <button
          type="button"
          onClick={bearbeiten}
          aria-label={`${k.name} bearbeiten`}
          title="Bearbeiten"
          className="druckbar flex size-7 items-center justify-center rounded-full border border-linie text-grau-stark hover:text-tinte"
        >
          <Pencil size={12} strokeWidth={1.75} />
        </button>
        {imRegister && (
          <button
            type="button"
            onClick={imRegister}
            aria-label={`${k.name} im Kontaktregister öffnen`}
            title="Im Kontaktregister öffnen"
            className="druckbar flex size-7 items-center justify-center rounded-full border border-linie text-grau-stark hover:text-tinte"
          >
            <BookUser size={12} strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          onClick={entfernen}
          aria-label={`${k.name} entfernen`}
          title="Vom Objekt lösen (bleibt im Register)"
          className="druckbar flex size-7 items-center justify-center rounded-full border border-linie text-grau-stark hover:text-tinte"
        >
          <X size={12} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function Kontaktformular({
  start,
  speichern,
  abbrechen,
  treffer,
  verknuepfen,
}: {
  start: Kontakt;
  speichern: (k: Kontakt) => void;
  abbrechen: () => void;
  /** Nur beim Anlegen: passende Kontakte aus dem Register. */
  treffer?: (name: string) => Kontaktdatensatz[];
  verknuepfen?: (kontaktId: string, rolle: Kontaktrolle) => void;
}) {
  const [k, setK] = useState(start);
  const setze = (teil: Partial<Kontakt>) => setK((alt) => ({ ...alt, ...teil }));
  const leer = (v: string) => (v.trim() === "" ? null : v.trim());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!k.name.trim()) return;
        speichern({ ...k, name: k.name.trim() });
      }}
      className="flex min-w-0 flex-col gap-2 rounded-[14px] border border-tinte bg-flaeche px-3.5 py-3"
    >
      <input
        autoFocus
        value={k.name}
        onChange={(e) => setze({ name: e.target.value })}
        placeholder="Name / Firma"
        aria-label="Name / Firma"
        className={FELD}
      />
      {treffer && verknuepfen && k.name.trim().length >= 2 && treffer(k.name).length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-flaeche-hoch p-1.5">
          <span className="px-1 text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-grau">
            Im Register
          </span>
          {treffer(k.name).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => verknuepfen(r.id, k.rolle)}
              className="druckbar flex items-center gap-1.5 rounded-md bg-flaeche px-2 py-1.5 text-left text-[0.72rem] text-tinte hover:bg-grund"
            >
              <Link2 size={11} className="shrink-0 text-grau" />
              <span className="min-w-0 flex-1 truncate">{anzeigename(r)}</span>
              <span className="shrink-0 text-[0.6rem] text-grau">{r.kategorien[0] ?? ""}</span>
            </button>
          ))}
        </div>
      )}
      <select
        value={k.rolle}
        onChange={(e) => setze({ rolle: e.target.value as Kontaktrolle })}
        aria-label="Rolle"
        className={FELD}
      >
        {KONTAKTROLLEN_REIHENFOLGE.map((r) => (
          <option key={r} value={r}>
            {KONTAKTROLLEN[r]}
          </option>
        ))}
      </select>
      <input
        value={k.telefon ?? ""}
        onChange={(e) => setze({ telefon: leer(e.target.value) })}
        placeholder="Telefon"
        aria-label="Telefon"
        inputMode="tel"
        className={FELD}
      />
      <input
        value={k.email ?? ""}
        onChange={(e) => setze({ email: leer(e.target.value) })}
        placeholder="E-Mail"
        aria-label="E-Mail"
        inputMode="email"
        className={FELD}
      />
      <input
        value={k.notiz ?? ""}
        onChange={(e) => setze({ notiz: leer(e.target.value) })}
        placeholder="Notiz"
        aria-label="Notiz"
        className={FELD}
      />
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={!k.name.trim()}
          className="druckbar h-8 rounded-full bg-tinte px-3.5 text-[0.64rem] font-semibold tracking-[0.12em] uppercase text-grund disabled:opacity-30"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={abbrechen}
          className="druckbar h-8 rounded-full border border-linie px-3.5 text-[0.64rem] font-semibold tracking-[0.12em] uppercase text-grau-stark"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
