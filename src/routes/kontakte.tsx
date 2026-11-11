/**
 * Kontakte — das zentrale Register, ersetzt das monday-Board „Kontakte“.
 *
 * Eine kompakte Tabelle mit Suche über alles, Filtern nach Gruppe, Kategorie
 * und Status, Sortierung je Spalte und gespeicherten Ansichten. Ein Klick
 * öffnet den Kontakt im großen Fenster: links die Daten, in der Mitte die
 * Notizen, rechts die Objekte, an denen er hängt.
 *
 * Marketinglisten bleiben in Brevo — hier stehen nur Menschen, mit denen
 * Revest arbeitet.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Mail, Phone, Plus, Search, Send, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Fenster, Seitenkopf } from "../components/AppLayout";
import {
  KATEGORIEGRUPPEN,
  KONTAKTSTATUS,
  anzeigename,
  letzterKontaktVon,
  neuerDatensatz,
  objekteVon,
  type Kategorie,
  type Kategoriegruppe,
  type Kontaktdatensatz,
  type Kontaktstatus,
} from "../lib/kontakte";
import { KONTAKTROLLEN, STUFEN, f } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn, gmailLink } from "../lib/utils";

export const Route = createFileRoute("/kontakte")({
  validateSearch: (such: Record<string, unknown>): { kontakt?: string } =>
    typeof such.kontakt === "string" ? { kontakt: such.kontakt } : {},
  component: KontakteSeite,
});

/* ------------------------------------------------------------------ */
/* Ansichten                                                            */
/* ------------------------------------------------------------------ */

interface Filter {
  suche: string;
  gruppe: Kategoriegruppe | null;
  kategorie: string | null;
  status: Kontaktstatus | null;
}

interface Ansicht {
  name: string;
  filter: Filter;
}

const LEER: Filter = { suche: "", gruppe: null, kategorie: null, status: null };

/** Wie in monday: die Ansichten, die man immer wieder braucht. */
const VORGEGEBEN: Ansicht[] = [
  { name: "Alle", filter: LEER },
  { name: "Alle Makler", filter: { ...LEER, kategorie: "Makler" } },
  { name: "Handwerker", filter: { ...LEER, kategorie: "Handwerker / Dienstleister" } },
  { name: "Kontaktieren", filter: { ...LEER, status: "todo" } },
];

const SPEICHER_ANSICHTEN = "revest.kontaktansichten.v1";

function ansichtenLaden(): Ansicht[] {
  try {
    return JSON.parse(localStorage.getItem(SPEICHER_ANSICHTEN) ?? "[]") as Ansicht[];
  } catch {
    return [];
  }
}

type Spalte = "name" | "firma" | "kategorie" | "ort" | "status" | "objekte" | "letzter";

/* ------------------------------------------------------------------ */
/* Seite                                                                */
/* ------------------------------------------------------------------ */

function KontakteSeite() {
  const { kontakt } = Route.useSearch();
  const navigate = useNavigate();
  const { register, objekte, kategorien, bereit } = useObjekte();

  const [filter, setFilter] = useState<Filter>(LEER);
  const [sortierung, setSortierung] = useState<{ spalte: Spalte; ab: boolean }>({
    spalte: "name",
    ab: false,
  });
  const [eigene, setEigene] = useState<Ansicht[]>(() =>
    typeof window === "undefined" ? [] : ansichtenLaden(),
  );
  const [speichernAls, setSpeichernAls] = useState<string | null>(null);

  const gruppeVon = (titel: string) =>
    kategorien.find((k) => k.titel === titel)?.gruppe ?? "sonstiges";

  const zeilen = useMemo(() => {
    const b = filter.suche.trim().toLowerCase();
    const liste = register
      .map((r) => ({ r, anzahl: objekteVon(r.id, objekte).length, letzter: letzterKontaktVon(r) }))
      .filter(({ r }) => {
        if (filter.status && r.status !== filter.status) return false;
        if (filter.kategorie && !r.kategorien.includes(filter.kategorie)) return false;
        if (filter.gruppe && !r.kategorien.some((k) => gruppeVon(k) === filter.gruppe))
          return false;
        if (!b) return true;
        return [
          r.name,
          r.firma,
          r.email,
          r.telefon,
          r.mobil,
          r.ort,
          r.quelle,
          ...r.kategorien,
          ...r.notizen.map((n) => n.text),
        ]
          .join(" ")
          .toLowerCase()
          .includes(b);
      });
    const wert = (z: (typeof liste)[number]): string | number => {
      switch (sortierung.spalte) {
        case "name":
          return (z.r.name || z.r.firma || "").toLowerCase();
        case "firma":
          return (z.r.firma ?? "").toLowerCase();
        case "kategorie":
          return z.r.kategorien[0] ?? "";
        case "ort":
          return (z.r.ort ?? "").toLowerCase();
        case "status":
          return Object.keys(KONTAKTSTATUS).indexOf(z.r.status);
        case "objekte":
          return z.anzahl;
        case "letzter":
          return z.letzter ?? "";
      }
    };
    return liste.sort((a, b2) => {
      const x = wert(a);
      const y = wert(b2);
      const v = x < y ? -1 : x > y ? 1 : 0;
      return sortierung.ab ? -v : v;
    });
    // gruppeVon hängt nur an `kategorien`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, objekte, filter, sortierung, kategorien]);

  const offen = kontakt ? register.find((r) => r.id === kontakt) : undefined;
  const neuOffen = kontakt === "neu";

  function oeffnen(id: string | undefined, ersetzen = false) {
    void navigate({ to: "/kontakte", search: id ? { kontakt: id } : {}, replace: ersetzen });
  }

  // Blättern im Fenster durch die gefilterte Liste.
  const stelle = offen ? zeilen.findIndex((z) => z.r.id === offen.id) : -1;
  const vorher = stelle > 0 ? zeilen[stelle - 1].r.id : null;
  const nachher = stelle >= 0 && stelle < zeilen.length - 1 ? zeilen[stelle + 1].r.id : null;

  function ansichtSpeichern() {
    const name = speichernAls?.trim();
    if (!name) return;
    const neu = [...eigene.filter((a) => a.name !== name), { name, filter }];
    setEigene(neu);
    try {
      localStorage.setItem(SPEICHER_ANSICHTEN, JSON.stringify(neu));
    } catch {
      // Ohne Speicher gilt die Ansicht nur bis zum Neuladen.
    }
    setSpeichernAls(null);
  }

  function ansichtLoeschen(name: string) {
    const neu = eigene.filter((a) => a.name !== name);
    setEigene(neu);
    try {
      localStorage.setItem(SPEICHER_ANSICHTEN, JSON.stringify(neu));
    } catch {
      /* siehe oben */
    }
  }

  const aktiv = (a: Ansicht) => JSON.stringify(a.filter) === JSON.stringify(filter);
  const chip = (an: boolean) =>
    cn(
      "druckbar rounded-full border px-3 py-1.5 text-[0.68rem] font-medium whitespace-nowrap",
      an
        ? "border-tinte bg-tinte text-grund"
        : "border-linie bg-flaeche text-grau-stark hover:text-tinte",
    );

  function kopf(spalte: Spalte, titel: string, rechts?: boolean, extra?: string) {
    const an = sortierung.spalte === spalte;
    return (
      <th className={cn("truncate px-3 py-2 whitespace-nowrap", rechts && "text-right", extra)}>
        <button
          type="button"
          onClick={() => setSortierung({ spalte, ab: an ? !sortierung.ab : false })}
          className={cn(
            "druckbar inline-flex items-center gap-1 uppercase",
            an ? "text-tinte" : "hover:text-grau-stark",
          )}
        >
          {titel}
          {an && <span aria-hidden>{sortierung.ab ? "↓" : "↑"}</span>}
        </button>
      </th>
    );
  }

  if (!bereit) return <div className="h-96" />;

  return (
    <>
      <Seitenkopf
        titel="Kontakte"
        aktion={
          <button
            type="button"
            onClick={() => oeffnen("neu")}
            className="druckbar flex items-center gap-2 rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-grund"
          >
            <Plus size={14} strokeWidth={2.25} />
            Kontakt
          </button>
        }
      />

      <div className="flex flex-col gap-3 border-b border-linie px-4 py-4 sm:px-6 md:px-10">
        <label className="relative block">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-grau"
          />
          <input
            value={filter.suche}
            onChange={(e) => setFilter({ ...filter, suche: e.target.value })}
            placeholder="Name, Firma, Telefon, E-Mail, Ort, Notiz …"
            aria-label="Kontakte durchsuchen"
            className="w-full rounded-full border border-linie bg-flaeche py-2.5 pr-4 pl-9 text-[0.8rem] text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
          />
        </label>

        {/* Gespeicherte Ansichten */}
        <div className="scroll-reihe flex items-center gap-1.5 overflow-x-auto">
          {[...VORGEGEBEN, ...eigene].map((a) => (
            <span key={a.name} className="flex shrink-0 items-center">
              <button type="button" onClick={() => setFilter(a.filter)} className={chip(aktiv(a))}>
                {a.name}
              </button>
              {eigene.includes(a) && (
                <button
                  type="button"
                  onClick={() => ansichtLoeschen(a.name)}
                  aria-label={`Ansicht ${a.name} löschen`}
                  className="druckbar -ml-1 flex size-6 items-center justify-center rounded-full text-grau hover:text-tinte"
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
          {speichernAls === null ? (
            <button
              type="button"
              onClick={() => setSpeichernAls("")}
              className="druckbar shrink-0 rounded-full border border-dashed border-linie-stark px-3 py-1.5 text-[0.68rem] text-grau-stark"
            >
              + Ansicht speichern
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ansichtSpeichern();
              }}
              className="flex shrink-0 items-center gap-1"
            >
              <input
                autoFocus
                value={speichernAls}
                onChange={(e) => setSpeichernAls(e.target.value)}
                placeholder="Name der Ansicht"
                aria-label="Name der Ansicht"
                className="h-8 w-40 rounded-full border border-linie-stark bg-flaeche px-3 text-[0.72rem] focus:outline-none"
              />
              <button type="submit" className={chip(true)}>
                Speichern
              </button>
            </form>
          )}
        </div>

        {/* Filter nach Gruppe, Kategorie, Status */}
        <div className="scroll-reihe flex items-center gap-1.5 overflow-x-auto">
          {(Object.keys(KATEGORIEGRUPPEN) as Kategoriegruppe[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() =>
                setFilter({ ...filter, gruppe: filter.gruppe === g ? null : g, kategorie: null })
              }
              className={chip(filter.gruppe === g)}
            >
              <span
                className="mr-1.5 inline-block size-[7px] rounded-full"
                style={{ background: KATEGORIEGRUPPEN[g].farbe }}
              />
              {KATEGORIEGRUPPEN[g].titel}
            </button>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-linie" />
          {(Object.keys(KONTAKTSTATUS) as Kontaktstatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter({ ...filter, status: filter.status === s ? null : s })}
              className={chip(filter.status === s)}
            >
              {KONTAKTSTATUS[s].titel}
            </button>
          ))}
        </div>
        {filter.gruppe && (
          <div className="scroll-reihe flex items-center gap-1.5 overflow-x-auto">
            {kategorien
              .filter((k) => k.gruppe === filter.gruppe)
              .map((k) => (
                <button
                  key={k.titel}
                  type="button"
                  onClick={() =>
                    setFilter({
                      ...filter,
                      kategorie: filter.kategorie === k.titel ? null : k.titel,
                    })
                  }
                  className={chip(filter.kategorie === k.titel)}
                >
                  {k.titel}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* ----- Tabelle ----- */}
      <div className="overflow-x-auto px-4 py-4 sm:px-6 md:px-10">
        {/* Feste Spaltenbreiten: bei 1440 px passt alles ohne seitliches
            Scrollen. Lange Einträge werden gekürzt, der volle Text steht im
            Tooltip. Schmaler blenden Ort und Objekte aus. */}
        <table className="w-full min-w-[46rem] table-fixed text-left text-[0.78rem]">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[14%]" />
            <col className="w-[15%]" />
            <col className="w-[11%]" />
            <col className="w-[17%]" />
            <col className="hidden w-[8%] xl:table-column" />
            <col className="w-[8%]" />
            <col className="hidden w-[5%] xl:table-column" />
            <col className="w-[9%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-linie text-[0.6rem] font-semibold tracking-[0.14em] text-grau">
              {kopf("name", "Name")}
              {kopf("firma", "Firma")}
              {kopf("kategorie", "Kategorie")}
              <th className="px-3 py-2 whitespace-nowrap uppercase">Telefon</th>
              <th className="px-3 py-2 whitespace-nowrap uppercase">E-Mail</th>
              {kopf("ort", "Ort", false, "hidden xl:table-cell")}
              {kopf("status", "Status")}
              {kopf("objekte", "Obj.", true, "hidden xl:table-cell")}
              {kopf("letzter", "Letzter", true)}
            </tr>
          </thead>
          <tbody>
            {zeilen.map(({ r, anzahl, letzter }) => (
              <tr
                key={r.id}
                onClick={() => oeffnen(r.id)}
                className="cursor-pointer border-b border-linie hover:bg-flaeche"
              >
                {/* Ohne Personennamen steht die Firma als Name da
                    („Gebäudeversicherung Süd“), statt „—“. */}
                <td
                  title={r.name || r.firma || undefined}
                  className="truncate px-3 py-2 font-medium text-tinte"
                >
                  {r.kontaktNichtGewuenscht && (
                    <span
                      title="Kontakt nicht gewünscht"
                      className="mr-1.5 inline-block size-2 rounded-full bg-[#CF4848] align-middle"
                    />
                  )}
                  {r.name || r.firma || "—"}
                </td>
                <td title={r.firma ?? undefined} className="truncate px-3 py-2 text-grau-stark">
                  {r.name ? (r.firma ?? "") : ""}
                </td>
                <td className="overflow-hidden px-3 py-2">
                  <Kategoriechips kategorien={r.kategorien} gruppeVon={gruppeVon} />
                </td>
                <td className="truncate px-3 py-2 whitespace-nowrap">
                  {(r.telefon || r.mobil) && (
                    <a
                      href={`tel:${(r.telefon || r.mobil)!.replace(/\s+/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="zahl text-grau-stark hover:text-tinte"
                    >
                      {r.telefon || r.mobil}
                    </a>
                  )}
                </td>
                <td title={r.email ?? undefined} className="truncate px-3 py-2">
                  {r.email && (
                    <a
                      href={`mailto:${r.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-grau-stark hover:text-tinte"
                    >
                      {r.email}
                    </a>
                  )}
                </td>
                <td
                  title={r.ort ?? undefined}
                  className="hidden truncate px-3 py-2 text-grau-stark xl:table-cell"
                >
                  {r.ort ?? ""}
                </td>
                <td className="overflow-hidden px-3 py-2">
                  <Statuschip status={r.status} />
                </td>
                <td className="zahl hidden px-3 py-2 text-right text-grau-stark xl:table-cell">
                  {anzahl || ""}
                </td>
                <td className="zahl truncate px-3 py-2 text-right whitespace-nowrap text-grau">
                  {letzter ? f.datum(letzter) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[0.68rem] text-grau">
          {zeilen.length} von {register.length} Kontakten
        </p>
      </div>

      <Fenster
        offen={!!offen || neuOffen}
        schliessen={() => oeffnen(undefined)}
        titel={offen ? anzeigename(offen) || "Kontakt" : "Neuer Kontakt"}
        vorher={vorher ? () => oeffnen(vorher, true) : undefined}
        nachher={nachher ? () => oeffnen(nachher, true) : undefined}
      >
        {offen && (
          <Kontaktfenster key={offen.id} kontakt={offen} schliessen={() => oeffnen(undefined)} />
        )}
        {neuOffen && (
          <Kontaktfenster
            key="neu"
            kontakt={null}
            schliessen={() => oeffnen(undefined)}
            gespeichert={(id) => oeffnen(id, true)}
          />
        )}
      </Fenster>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bausteine                                                            */
/* ------------------------------------------------------------------ */

export function Kategoriechips({
  kategorien,
  gruppeVon,
}: {
  kategorien: string[];
  gruppeVon: (titel: string) => Kategoriegruppe;
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {kategorien.map((k) => {
        const g = KATEGORIEGRUPPEN[gruppeVon(k)];
        return (
          <span
            key={k}
            className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold whitespace-nowrap"
            style={{ background: g.weich, color: g.tief }}
          >
            {k}
          </span>
        );
      })}
    </span>
  );
}

function Statuschip({ status }: { status: Kontaktstatus }) {
  const s = KONTAKTSTATUS[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[0.62rem] font-semibold"
      style={{ background: s.weich, color: s.tief }}
    >
      {s.titel}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Kontakt im Fenster                                                   */
/* ------------------------------------------------------------------ */

const FELD =
  "h-8 w-full rounded-lg border border-linie bg-flaeche px-2.5 text-[0.78rem] text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none";

function Kontaktfenster({
  kontakt,
  schliessen,
  gespeichert,
}: {
  kontakt: Kontaktdatensatz | null;
  schliessen: () => void;
  gespeichert?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { register, objekte, kategorien, kontaktSpeichern, kontaktNotiz, kontaktLoeschen } =
    useObjekte();
  const [d, setD] = useState<Kontaktdatensatz>(() => kontakt ?? neuerDatensatz());
  const [notiz, setNotiz] = useState("");
  const setze = (teil: Partial<Kontaktdatensatz>) => setD((alt) => ({ ...alt, ...teil }));
  const leer = (v: string) => (v.trim() === "" ? null : v);

  const geaendert = JSON.stringify(d) !== JSON.stringify(kontakt);
  const verknuepft = kontakt ? objekteVon(kontakt.id, objekte) : [];
  const firmen = useMemo(
    () => [...new Set(register.map((r) => r.firma).filter((x): x is string => !!x))].sort(),
    [register],
  );
  const aktuell = kontakt ? (register.find((r) => r.id === kontakt.id) ?? kontakt) : d;
  const gruppen = (Object.keys(KATEGORIEGRUPPEN) as Kategoriegruppe[]).map((g) => ({
    g,
    liste: kategorien.filter((k: Kategorie) => k.gruppe === g),
  }));

  function speichern() {
    if (!d.name.trim() && !d.firma?.trim()) return;
    kontaktSpeichern({ ...d, name: d.name.trim(), firma: d.firma?.trim() || null });
    if (!kontakt) gespeichert?.(d.id);
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-linie px-4 py-3 md:px-7">
        <h2 className="headline min-w-0 flex-1 truncate text-[1.25rem]">
          {anzeigename(d) || "Neuer Kontakt"}
        </h2>
        {d.email && (
          <a
            href={gmailLink(d.email)}
            target="_blank"
            rel="noreferrer"
            className="druckbar flex h-8 items-center gap-1.5 rounded-full bg-tinte px-3.5 text-[0.62rem] font-semibold tracking-[0.12em] uppercase text-grund"
          >
            <Mail size={12} strokeWidth={2} />
            E-Mail schreiben
          </a>
        )}
        {(d.telefon || d.mobil) && (
          <a
            href={`tel:${(d.telefon || d.mobil)!.replace(/\s+/g, "")}`}
            className="druckbar flex h-8 items-center gap-1.5 rounded-full border border-linie-stark px-3.5 text-[0.62rem] font-semibold tracking-[0.12em] uppercase text-tinte"
          >
            <Phone size={12} strokeWidth={2} />
            Anrufen
          </a>
        )}
      </div>

      {/* Gilt vor jeder Ansprache — deshalb ganz oben und rot. */}
      <label className="flex cursor-pointer items-center gap-2 border-b border-linie px-4 py-2 text-[0.74rem] md:px-7">
        <input
          type="checkbox"
          checked={Boolean(d.kontaktNichtGewuenscht)}
          onChange={(e) => setze({ kontaktNichtGewuenscht: e.target.checked })}
          className="size-4 accent-[#CF4848]"
        />
        <span
          className={d.kontaktNichtGewuenscht ? "font-semibold text-[#9A2727]" : "text-grau-stark"}
        >
          Kontakt nicht gewünscht
        </span>
        {d.anschrift && <span className="ml-auto truncate text-grau">{d.anschrift}</span>}
      </label>

      <div className="grid gap-px bg-linie lg:grid-cols-3">
        {/* ----- Daten ----- */}
        <section className="flex flex-col gap-2.5 bg-grund px-4 py-5 md:px-7">
          <div className="mini-label">Kontaktdaten</div>
          <input
            className={FELD}
            placeholder="Name (Person)"
            aria-label="Name"
            value={d.name}
            onChange={(e) => setze({ name: e.target.value })}
          />
          <input
            className={FELD}
            placeholder="Firma"
            aria-label="Firma"
            list="firmen-vorschlaege"
            value={d.firma ?? ""}
            onChange={(e) => setze({ firma: leer(e.target.value) })}
          />
          <datalist id="firmen-vorschlaege">
            {firmen.map((fi) => (
              <option key={fi} value={fi} />
            ))}
          </datalist>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={FELD}
              placeholder="Telefon"
              aria-label="Telefon"
              inputMode="tel"
              value={d.telefon ?? ""}
              onChange={(e) => setze({ telefon: leer(e.target.value) })}
            />
            <input
              className={FELD}
              placeholder="Mobil"
              aria-label="Mobil"
              inputMode="tel"
              value={d.mobil ?? ""}
              onChange={(e) => setze({ mobil: leer(e.target.value) })}
            />
          </div>
          <input
            className={FELD}
            placeholder="E-Mail"
            aria-label="E-Mail"
            inputMode="email"
            value={d.email ?? ""}
            onChange={(e) => setze({ email: leer(e.target.value) })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={FELD}
              placeholder="Ort / Region"
              aria-label="Ort"
              value={d.ort ?? ""}
              onChange={(e) => setze({ ort: leer(e.target.value) })}
            />
            <input
              className={FELD}
              placeholder="Quelle"
              aria-label="Quelle"
              value={d.quelle ?? ""}
              onChange={(e) => setze({ quelle: leer(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              className={FELD}
              aria-label="Status"
              value={d.status}
              onChange={(e) => setze({ status: e.target.value as Kontaktstatus })}
            >
              {(Object.keys(KONTAKTSTATUS) as Kontaktstatus[]).map((s) => (
                <option key={s} value={s}>
                  {KONTAKTSTATUS[s].titel}
                </option>
              ))}
            </select>
            <input
              className={cn(FELD, "zahl")}
              type="date"
              aria-label="Letzter Kontakt"
              title="Letzter Kontakt"
              value={(d.letzterKontakt ?? "").slice(0, 10)}
              onChange={(e) => setze({ letzterKontakt: e.target.value || null })}
            />
          </div>

          <div className="mini-label mt-2">Kategorien</div>
          <div className="flex flex-col gap-1.5">
            {gruppen.map(({ g, liste }) => (
              <div key={g} className="flex flex-wrap gap-1">
                {liste.map((k) => {
                  const an = d.kategorien.includes(k.titel);
                  const farbe = KATEGORIEGRUPPEN[g];
                  return (
                    <button
                      key={k.titel}
                      type="button"
                      onClick={() =>
                        setze({
                          kategorien: an
                            ? d.kategorien.filter((x) => x !== k.titel)
                            : [...d.kategorien, k.titel],
                        })
                      }
                      aria-pressed={an}
                      className="druckbar rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold"
                      style={
                        an
                          ? { background: farbe.weich, color: farbe.tief, borderColor: farbe.farbe }
                          : undefined
                      }
                    >
                      {k.titel}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={speichern}
              disabled={!geaendert || (!d.name.trim() && !d.firma?.trim())}
              className="druckbar h-8 rounded-full bg-tinte px-4 text-[0.64rem] font-semibold tracking-[0.12em] uppercase text-grund disabled:opacity-30"
            >
              Speichern
            </button>
            {kontakt && verknuepft.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  kontaktLoeschen(kontakt.id);
                  schliessen();
                }}
                className="druckbar flex h-8 items-center gap-1.5 rounded-full border border-linie px-3 text-[0.64rem] text-grau hover:text-[#9A2727]"
              >
                <Trash2 size={12} />
                Löschen
              </button>
            )}
          </div>
        </section>

        {/* ----- Notizen ----- */}
        <section className="flex flex-col gap-2.5 bg-grund px-4 py-5 md:px-7">
          <div className="mini-label">Notizen</div>
          {kontakt ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!notiz.trim()) return;
                  kontaktNotiz(kontakt.id, notiz.trim());
                  setNotiz("");
                }}
                className="flex gap-2"
              >
                <input
                  value={notiz}
                  onChange={(e) => setNotiz(e.target.value)}
                  placeholder="Neue Notiz …"
                  aria-label="Neue Notiz"
                  className="min-w-0 flex-1 rounded-xl border border-linie bg-flaeche px-3 py-2 text-[0.78rem] text-tinte focus:border-linie-stark focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!notiz.trim()}
                  aria-label="Notiz speichern"
                  className="druckbar flex size-9 shrink-0 items-center justify-center rounded-full bg-tinte text-grund disabled:opacity-30"
                >
                  <Send size={13} />
                </button>
              </form>
              {aktuell.notizen.length === 0 ? (
                <p className="text-[0.74rem] text-grau">Noch keine Notizen.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {[...aktuell.notizen]
                    .sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt))
                    .map((n) => (
                      <li key={n.id}>
                        <div className="zahl text-[0.62rem] text-grau">
                          {f.datum(n.zeitpunkt)}
                          {n.verfasser && ` · ${n.verfasser}`}
                        </div>
                        <p className="mt-0.5 text-[0.78rem] leading-relaxed whitespace-pre-line text-grau-stark">
                          {n.text}
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-[0.74rem] text-grau">Notizen nach dem ersten Speichern.</p>
          )}
        </section>

        {/* ----- Objekte ----- */}
        <section className="flex flex-col gap-2.5 bg-grund px-4 py-5 md:px-7">
          <div className="mini-label">Verknüpfte Objekte</div>
          {verknuepft.length === 0 ? (
            <p className="text-[0.74rem] text-grau">
              An keinem Objekt. Verknüpft wird im Objekt unter „Kontakte“.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {verknuepft.map(({ objekt: o, rolle }) => (
                <li key={`${o.id}-${rolle}`}>
                  <button
                    type="button"
                    onClick={() =>
                      void navigate({
                        to: o.stufe === "angekauft" ? "/projekte" : "/ankauf",
                        search: { objekt: o.id },
                      })
                    }
                    className="druckbar flex w-full items-center gap-2.5 rounded-xl border border-linie bg-flaeche px-3 py-2.5 text-left"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: STUFEN[o.stufe].farbe }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8rem] font-medium text-tinte">
                        {o.bezeichnung?.trim() || o.strasse}
                      </span>
                      <span className="block truncate text-[0.66rem] text-grau">
                        {STUFEN[o.stufe].titel} · als {KONTAKTROLLEN[rolle]}
                      </span>
                    </span>
                    <ArrowUpRight size={13} className="shrink-0 text-grau" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Einstellungen: Kategorien pflegen                                     */
/* ------------------------------------------------------------------ */

/**
 * Kategorien je Gruppe: hinzufügen und entfernen. Eine Kategorie, die noch an
 * Kontakten hängt, lässt sich nicht entfernen — sonst verlören diese still
 * ihre Einordnung.
 */
export function KategorienPflegen() {
  const { kategorien, kategorienSetzen, register } = useObjekte();
  const [neu, setNeu] = useState("");
  const [gruppe, setGruppe] = useState<Kategoriegruppe>("ankauf");

  return (
    <div className="mt-5 flex max-w-3xl flex-col gap-3">
      {(Object.keys(KATEGORIEGRUPPEN) as Kategoriegruppe[]).map((g) => (
        <div key={g} className="flex flex-wrap items-center gap-1.5">
          <span
            className="w-40 shrink-0 text-[0.7rem] font-semibold"
            style={{ color: KATEGORIEGRUPPEN[g].tief }}
          >
            {KATEGORIEGRUPPEN[g].titel}
          </span>
          {kategorien
            .filter((k) => k.gruppe === g)
            .map((k) => {
              const benutzt = register.some((r) => r.kategorien.includes(k.titel));
              return (
                <span
                  key={k.titel}
                  className="flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-[0.66rem] font-semibold"
                  style={{ background: KATEGORIEGRUPPEN[g].weich, color: KATEGORIEGRUPPEN[g].tief }}
                >
                  {k.titel}
                  <button
                    type="button"
                    disabled={benutzt}
                    onClick={() => kategorienSetzen(kategorien.filter((x) => x.titel !== k.titel))}
                    title={benutzt ? "Wird noch von Kontakten genutzt" : "Entfernen"}
                    aria-label={`${k.titel} entfernen`}
                    className="druckbar flex size-4 items-center justify-center rounded-full disabled:opacity-30"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const titel = neu.trim();
          if (!titel || kategorien.some((k) => k.titel.toLowerCase() === titel.toLowerCase()))
            return;
          kategorienSetzen([...kategorien, { titel, gruppe }]);
          setNeu("");
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          value={neu}
          onChange={(e) => setNeu(e.target.value)}
          placeholder="Neue Kategorie"
          aria-label="Neue Kategorie"
          className="h-8 rounded-full border border-linie bg-flaeche px-3 text-[0.74rem] focus:border-linie-stark focus:outline-none"
        />
        <select
          value={gruppe}
          onChange={(e) => setGruppe(e.target.value as Kategoriegruppe)}
          aria-label="Gruppe"
          className="h-8 rounded-full border border-linie bg-flaeche px-3 text-[0.74rem]"
        >
          {(Object.keys(KATEGORIEGRUPPEN) as Kategoriegruppe[]).map((g) => (
            <option key={g} value={g}>
              {KATEGORIEGRUPPEN[g].titel}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!neu.trim()}
          className="druckbar h-8 rounded-full bg-tinte px-4 text-[0.64rem] font-semibold tracking-[0.12em] uppercase text-grund disabled:opacity-30"
        >
          Hinzufügen
        </button>
      </form>
    </div>
  );
}
