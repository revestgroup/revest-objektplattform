/**
 * Ankauf-Eingang: Angebote sichten in Sekunden.
 *
 * Links die Liste (was ins Suchprofil passt oben, der Rest markiert darunter),
 * rechts das Angebot im Fokus. J = interessant, N = aussortiert, Pfeile =
 * weiter, 1–7 wählt einen Grund. Am Telefon wischen: rechts interessant,
 * links aussortiert. Ziel: 12 Angebote am Tag in 2–3 Minuten.
 *
 * „Interessant“ legt das Objekt sofort auf Stufe „Neu“ an — mit Punkt aus der
 * Adresssuche. Eine bekannte Adresse öffnet stattdessen das bestehende Objekt.
 */
import {
  ArrowRight,
  Check,
  FileText,
  History,
  Inbox,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  AUSSORTIER_GRUENDE,
  EINGANGSQUELLEN,
  profilAbweichungen,
  sortiereEingang,
  textAuslesen,
  wiedererkennen,
  type Angebotseingang,
  type Eingangsquelle,
  type Suchprofil,
} from "../lib/eingang";
import { neueEingangsId, useEingang } from "../lib/eingangStore";
import { geocode } from "../lib/geocode";
import { anzeigename } from "../lib/kontakte";
import {
  OBJEKTARTEN,
  STUFEN,
  UNSORTIERT,
  f,
  istAktiv,
  umrissAusMitte,
  type Objekt,
  type Objektart,
} from "../lib/objekte";
import { useObjekte, type ObjektEntwurf } from "../lib/objekteStore";
import { STADTTEIL_NAMEN, stadtteilAnPunkt } from "../lib/stadtteile";
import { cn } from "../lib/utils";
import { Dialog } from "./Dialog";

/** Stadtkern als Notlösung, wenn die Adresssuche nichts findet. */
const STADTKERN: Record<string, [number, number]> = {
  Ulm: [9.9916, 48.3984],
  "Neu-Ulm": [10.0047, 48.3922],
};

/* ------------------------------------------------------------------ */
/* Aus einem Angebot ein Objekt                                         */
/* ------------------------------------------------------------------ */

async function objektEntwurf(e: Angebotseingang): Promise<ObjektEntwurf> {
  let punkt: [number, number] | null = null;
  try {
    punkt = await geocode({ strasse: e.strasse, plz: e.plz, stadt: e.stadt });
  } catch {
    // Ohne Netz oder ohne Treffer: Stadtkern, mit Hinweis in der Notiz.
  }
  // Ein Treffer außerhalb von Ulm/Neu-Ulm ist eine Namensgleichheit im Umland,
  // nicht das Angebot — dann lieber Stadtkern und ehrlicher Hinweis.
  if (punkt && !stadtteilAnPunkt(punkt[0], punkt[1])) punkt = null;
  const ungefaehr = !punkt;
  const [laenge, breite] = punkt ?? STADTKERN[e.stadt] ?? STADTKERN.Ulm;
  const teil = punkt ? stadtteilAnPunkt(laenge, breite) : undefined;
  const stadt = teil?.stadt ?? (e.stadt === "Neu-Ulm" ? "Neu-Ulm" : "Ulm");
  const stadtteil =
    teil?.name ?? e.stadtteil ?? STADTTEIL_NAMEN.find((s) => s.stadt === stadt)?.name ?? "";
  const quelleTitel = EINGANGSQUELLEN[e.quelle];

  return {
    laenge,
    breite,
    umriss: umrissAusMitte(laenge, breite),
    bezeichnung: null,
    strasse: e.strasse,
    plz: e.plz,
    stadt,
    stadtteil,
    bundesland: stadt === "Neu-Ulm" ? "BY" : "BW",
    objektart: e.objektart ?? "etw",
    zustand: "vermietet",
    stufe: "neu",
    kaufpreis: e.preis,
    ankaufslimit: null,
    wohnflaeche: e.flaeche,
    gewerbeflaeche: null,
    grundstuecksflaeche: null,
    anzahlEinheiten: e.objektart === "etw" ? 1 : null,
    baujahr: null,
    letzteSanierung: null,
    jahresNettokaltmiete: null,
    potenzialMiete: null,
    nichtUmlagefaehig: null,
    instandhaltungsruecklage: null,
    maklerprovision: null,
    energieklasse: null,
    energiekennwert: null,
    denkmalschutz: false,
    erbbaurecht: false,
    zimmer: e.zimmer,
    kontakte: e.absender
      ? [
          {
            id: `kon-${e.id}`,
            rolle: "makler",
            name: e.absender,
            telefon: null,
            email: e.absenderEmail,
            notiz: null,
            kontaktId: e.kontaktId,
          },
        ]
      : [],
    quelle: e.absender ? `${quelleTitel} · ${e.absender}` : quelleTitel,
    notiz:
      [ungefaehr ? "Lage nur ungefähr (Stadtkern) — Punkt auf der Karte prüfen." : null, e.mailtext]
        .filter(Boolean)
        .join("\n\n") || null,
    bilder: [],
    angebote: e.preis
      ? [
          {
            id: `ang-${e.id}`,
            datum: e.eingangAm,
            art: "forderung",
            preis: e.preis,
            quelle: e.absender ?? quelleTitel,
            ergebnis: "offen",
            notiz: "Aus dem Ankauf-Eingang",
          },
        ]
      : [],
    sanierung: [],
    fristBis: null,
  };
}

/* ------------------------------------------------------------------ */
/* Ansicht                                                              */
/* ------------------------------------------------------------------ */

export function Eingangsansicht({ oeffneObjekt }: { oeffneObjekt: (id: string) => void }) {
  const { eingaenge, suchprofil, bereit, sichten, zuruecknehmen } = useEingang();
  const { objekte, anlegen, stufeSetzen, angebotHinzufuegen, dokumenteAnhaengen } = useObjekte();
  const [reiter, setReiter] = useState<"sichten" | "archiv">("sichten");
  const [auswahl, setAuswahl] = useState(0);
  const [grund, setGrund] = useState<string | null>(null);
  const [erfassen, setErfassen] = useState(false);
  const [zuletzt, setZuletzt] = useState<{ id: string; text: string } | null>(null);
  const [arbeitet, setArbeitet] = useState(false);

  const offen = useMemo(
    () =>
      sortiereEingang(
        eingaenge.filter((e) => e.status === "offen"),
        suchprofil,
      ),
    [eingaenge, suchprofil],
  );
  const fokus = offen[Math.min(auswahl, offen.length - 1)] ?? null;
  const bekannt = fokus ? wiedererkennen(fokus, objekte, eingaenge) : null;
  const abweichung = fokus ? profilAbweichungen(fokus, suchprofil) : [];

  async function interessant(e: Angebotseingang) {
    if (arbeitet) return;
    setArbeitet(true);
    try {
      const b = wiedererkennen(e, objekte, eingaenge);
      let objektId: string;
      if (b?.objekt) {
        // Bekannt: Preisnennung anhängen (falls noch nicht da) und zurück auf „Neu“.
        const o = b.objekt;
        if (e.preis && !o.angebote.some((a) => a.preis === e.preis && a.datum === e.eingangAm)) {
          angebotHinzufuegen(
            o.id,
            {
              datum: e.eingangAm,
              art: "forderung",
              preis: e.preis,
              quelle: e.absender ?? EINGANGSQUELLEN[e.quelle],
              ergebnis: "offen",
              notiz: "Aus dem Ankauf-Eingang",
            },
            `Erneut angeboten für ${f.eur(e.preis)} (${e.absender ?? EINGANGSQUELLEN[e.quelle]})`,
          );
        }
        if (!istAktiv(o.stufe) && o.stufe !== "angekauft") stufeSetzen(o.id, "neu");
        objektId = o.id;
      } else {
        const neu = anlegen(await objektEntwurf(e));
        if (e.expose)
          dokumenteAnhaengen(neu.id, [{ name: e.expose.name, ordner: UNSORTIERT, groesseKb: 1 }]);
        objektId = neu.id;
      }
      sichten(e.id, "interessant", { objektId });
      setZuletzt({ id: e.id, text: `${e.strasse}: interessant → Stufe Neu` });
    } finally {
      setArbeitet(false);
    }
  }

  function aussortieren(e: Angebotseingang) {
    sichten(e.id, "aussortiert", { grund });
    setZuletzt({ id: e.id, text: `${e.strasse}: aussortiert${grund ? ` (${grund})` : ""}` });
    setGrund(null);
  }

  // Tastatur: J/N sichten, Pfeile weiter, 1–7 Grund, Z rückgängig.
  const tasten = useRef({ fokus, interessant, aussortieren });
  tasten.current = { fokus, interessant, aussortieren };
  useEffect(() => {
    if (reiter !== "sichten" || erfassen) return;
    const beiTaste = (ev: KeyboardEvent) => {
      if (document.querySelector(".schleier, [role=dialog]")) return;
      const ziel = ev.target;
      if (ziel instanceof Element && ziel.closest("input, textarea, select")) return;
      const { fokus: e, interessant: ja, aussortieren: nein } = tasten.current;
      const k = ev.key.toLowerCase();
      if (k === "arrowdown" || k === "arrowright") {
        ev.preventDefault();
        setAuswahl((i) => i + 1);
      } else if (k === "arrowup" || k === "arrowleft") {
        ev.preventDefault();
        setAuswahl((i) => Math.max(0, i - 1));
      } else if (k === "j" && e) void ja(e);
      else if (k === "n" && e) nein(e);
      else if (/^[1-7]$/.test(k))
        setGrund((g) => (g === AUSSORTIER_GRUENDE[+k - 1] ? null : AUSSORTIER_GRUENDE[+k - 1]));
      else if (k === "z" && zuletztRef.current) {
        zuruecknehmen(zuletztRef.current.id);
        setZuletzt(null);
      }
    };
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, [reiter, erfassen, zuruecknehmen]);
  const zuletztRef = useRef(zuletzt);
  zuletztRef.current = zuletzt;

  // Am Telefon: wischen.
  const wisch = useRef<number | null>(null);

  if (!bereit) return <div className="h-48" />;

  return (
    <div className="px-4 py-4 sm:px-6 md:px-10">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-flaeche-hoch p-1">
          {(
            [
              ["sichten", `Zu sichten · ${offen.length}`],
              ["archiv", "Archiv"],
            ] as const
          ).map(([w, t]) => (
            <button
              key={w}
              type="button"
              onClick={() => setReiter(w)}
              aria-pressed={reiter === w}
              className={cn(
                "druckbar rounded-full px-3.5 py-1.5 text-[0.7rem] font-medium",
                reiter === w ? "bg-tinte text-grund" : "text-grau-stark",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="hidden text-[0.66rem] text-grau md:inline">
          J interessant · N aussortiert · ↑↓ weiter · 1–7 Grund · Z rückgängig
        </span>
        <button
          type="button"
          onClick={() => setErfassen(true)}
          className="druckbar ml-auto flex items-center gap-2 rounded-full bg-tinte px-4 py-2 text-[0.66rem] font-semibold tracking-[0.1em] uppercase text-grund"
        >
          <Plus size={13} strokeWidth={2.25} />
          Angebot
        </button>
      </div>

      {zuletzt && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-flaeche-hoch px-3 py-2 text-[0.72rem] text-grau-stark">
          <Check size={13} className="text-[#17935C]" />
          <span className="min-w-0 flex-1 truncate">{zuletzt.text}</span>
          <button
            type="button"
            onClick={() => {
              zuruecknehmen(zuletzt.id);
              setZuletzt(null);
            }}
            className="druckbar flex items-center gap-1 text-[0.68rem] font-semibold text-tinte"
          >
            <RotateCcw size={11} />
            Rückgängig
          </button>
        </div>
      )}

      {reiter === "archiv" ? (
        <Archiv oeffneObjekt={oeffneObjekt} />
      ) : offen.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Inbox size={26} strokeWidth={1.5} className="text-grau" />
          <p className="text-[0.84rem] text-grau">Eingang leer — alles gesichtet.</p>
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
          {/* ----- Liste ----- */}
          <ul className="flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto">
            {offen.map((e, i) => {
              const ab = profilAbweichungen(e, suchprofil);
              const kennt = wiedererkennen(e, objekte, eingaenge);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setAuswahl(i)}
                    aria-current={e === fokus}
                    className={cn(
                      "druckbar w-full rounded-xl border px-3 py-2 text-left",
                      e === fokus
                        ? "border-tinte bg-flaeche shadow-karte"
                        : "border-linie bg-flaeche",
                      ab.length > 0 && e !== fokus && "opacity-60",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[0.8rem] font-medium text-tinte">
                        {e.strasse || "Ohne Adresse"}
                      </span>
                      <span className="zahl shrink-0 text-[0.74rem] text-tinte">
                        {f.eurKurz(e.preis)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.62rem] text-grau">
                      <span>
                        {e.stadt}
                        {e.flaeche ? ` · ${f.qm(e.flaeche)}` : ""}
                        {e.objektart ? ` · ${OBJEKTARTEN[e.objektart]}` : ""}
                      </span>
                      {kennt && (
                        <span className="rounded-full bg-[#E4EAF2] px-1.5 text-[#38506E]">
                          bekannt
                        </span>
                      )}
                      {ab.length > 0 && (
                        <span className="rounded-full bg-[#FBEBD1] px-1.5 text-[#8A5A08]">
                          außerhalb Profil
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* ----- Fokus ----- */}
          {fokus && (
            <section
              onPointerDown={(ev) => {
                if (ev.pointerType !== "mouse") wisch.current = ev.clientX;
              }}
              onPointerUp={(ev) => {
                if (wisch.current === null) return;
                const dx = ev.clientX - wisch.current;
                wisch.current = null;
                if (dx > 80) void interessant(fokus);
                else if (dx < -80) aussortieren(fokus);
              }}
              className="flex flex-col gap-3 rounded-2xl border border-linie bg-flaeche p-4 md:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mini-label">
                    {EINGANGSQUELLEN[fokus.quelle]} · {f.datum(fokus.eingangAm)}
                    {fokus.absender ? ` · ${fokus.absender}` : ""}
                  </div>
                  <h3 className="headline mt-1 text-[1.3rem]">{fokus.strasse || "Ohne Adresse"}</h3>
                  <div className="text-[0.76rem] text-grau">
                    {fokus.plz} {fokus.stadt}
                    {fokus.stadtteil ? ` · ${fokus.stadtteil}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="zahl text-[1.25rem] font-semibold text-tinte">
                    {f.eur(fokus.preis)}
                  </div>
                  <div className="zahl text-[0.72rem] text-grau-stark">
                    {f.qm(fokus.flaeche)}
                    {fokus.zimmer ? ` · ${fokus.zimmer} Zi.` : ""}
                    {fokus.preis && fokus.flaeche
                      ? ` · ${f.eur(fokus.preis / fokus.flaeche)}/m²`
                      : ""}
                  </div>
                </div>
              </div>

              {bekannt && (
                <div className="flex items-center gap-2 rounded-xl bg-[#E4EAF2] px-3 py-2 text-[0.74rem] text-[#38506E]">
                  <History size={14} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    Bekannt seit {f.datum(bekannt.seit)}
                    {bekannt.damals ? `, damals ${f.eur(bekannt.damals)}` : ""}
                    {bekannt.objekt && ` · Objekt auf „${STUFEN[bekannt.objekt.stufe].titel}“`}
                  </span>
                  {bekannt.objekt && (
                    <button
                      type="button"
                      onClick={() => oeffneObjekt(bekannt.objekt!.id)}
                      className="druckbar shrink-0 font-semibold underline-offset-2 hover:underline"
                    >
                      Öffnen
                    </button>
                  )}
                </div>
              )}
              {abweichung.length > 0 && (
                <div className="rounded-xl bg-[#FBEBD1] px-3 py-2 text-[0.72rem] text-[#8A5A08]">
                  Außerhalb des Suchprofils: {abweichung.join(", ")}
                </div>
              )}

              {fokus.mailtext && (
                <p className="max-h-48 overflow-y-auto rounded-xl bg-flaeche-hoch px-3 py-2.5 text-[0.74rem] leading-relaxed whitespace-pre-line text-grau-stark">
                  {fokus.mailtext}
                </p>
              )}
              {fokus.expose && (
                <a
                  href={fokus.expose.vorschau ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-[0.72rem] text-grau-stark hover:text-tinte"
                >
                  <FileText size={13} />
                  {fokus.expose.name}
                  {!fokus.expose.vorschau && " (Vorschau nur in der Sitzung des Uploads)"}
                </a>
              )}

              <div className="flex flex-wrap gap-1.5">
                {AUSSORTIER_GRUENDE.map((g, i) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrund(grund === g ? null : g)}
                    aria-pressed={grund === g}
                    className={cn(
                      "druckbar rounded-full border px-2.5 py-1 text-[0.66rem]",
                      grund === g
                        ? "border-[#CF4848] bg-[#FBE2E2] text-[#9A2727]"
                        : "border-linie text-grau-stark",
                    )}
                  >
                    <span className="zahl mr-1 text-grau">{i + 1}</span>
                    {g}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => aussortieren(fokus)}
                  className="druckbar flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#E3BDB9] bg-[#FBE2E2] text-[0.74rem] font-semibold text-[#9A2727]"
                >
                  <X size={15} />
                  Aussortiert <span className="zahl text-[0.62rem] opacity-70">N</span>
                </button>
                <button
                  type="button"
                  onClick={() => void interessant(fokus)}
                  disabled={arbeitet}
                  style={{ backgroundColor: "#17935C" }}
                  className="druckbar flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[0.74rem] font-semibold text-white disabled:opacity-60"
                >
                  <Check size={15} />
                  {arbeitet
                    ? "Lege an …"
                    : bekannt?.objekt
                      ? "Interessant · zum Objekt"
                      : "Interessant → Neu"}
                  <span className="zahl text-[0.62rem] opacity-70">J</span>
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {erfassen && <Schnellerfassung schliessen={() => setErfassen(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Schnellerfassung                                                     */
/* ------------------------------------------------------------------ */

function Schnellerfassung({ schliessen }: { schliessen: () => void }) {
  const { eingaenge, erfassen } = useEingang();
  const { objekte, register, angebotHinzufuegen } = useObjekte();
  const [text, setText] = useState("");
  const [e, setE] = useState<Angebotseingang>(() => ({
    id: neueEingangsId(),
    strasse: "",
    plz: "",
    stadt: "Ulm",
    stadtteil: null,
    preis: null,
    flaeche: null,
    zimmer: null,
    objektart: null,
    absender: null,
    absenderEmail: null,
    kontaktId: null,
    eingangAm: new Date().toISOString(),
    quelle: "makler",
    expose: null,
    mailtext: null,
    status: "offen",
    grund: null,
    objektId: null,
    gesichtetAm: null,
  }));
  const setze = (teil: Partial<Angebotseingang>) => setE((alt) => ({ ...alt, ...teil }));

  function auslesen(t: string) {
    setText(t);
    const r = textAuslesen(t);
    // Nur füllen, was erkannt wurde — von Hand Getipptes bleibt stehen.
    const kontakt = r.absenderEmail
      ? register.find((k) => k.email?.toLowerCase() === r.absenderEmail!.toLowerCase())
      : undefined;
    setE((alt) => ({
      ...alt,
      mailtext: t || null,
      strasse: r.strasse ?? alt.strasse,
      plz: r.plz ?? alt.plz,
      stadt: r.stadt ?? alt.stadt,
      preis: r.preis ?? alt.preis,
      flaeche: r.flaeche ?? alt.flaeche,
      zimmer: r.zimmer ?? alt.zimmer,
      objektart: r.objektart ?? alt.objektart,
      absender: kontakt ? anzeigename(kontakt) : (r.absender ?? alt.absender),
      absenderEmail: r.absenderEmail ?? alt.absenderEmail,
      kontaktId: kontakt?.id ?? alt.kontaktId,
      quelle: r.quelle !== "sonst" ? r.quelle : alt.quelle,
    }));
  }

  const bekannt = e.strasse ? wiedererkennen(e, objekte, eingaenge) : null;
  const feld =
    "h-9 w-full rounded-xl border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";
  const zahl = (v: string) => {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return v.trim() === "" || !Number.isFinite(n) ? null : n;
  };

  function speichern() {
    if (!e.strasse.trim()) return;
    erfassen({ ...e, strasse: e.strasse.trim() });
    // Bekannte Adresse: die neue Preisnennung gehört sofort ans Objekt.
    if (bekannt?.objekt && e.preis) {
      angebotHinzufuegen(
        bekannt.objekt.id,
        {
          datum: e.eingangAm,
          art: "forderung",
          preis: e.preis,
          quelle: e.absender ?? EINGANGSQUELLEN[e.quelle],
          ergebnis: "offen",
          notiz: "Aus dem Ankauf-Eingang",
        },
        `Erneut angeboten für ${f.eur(e.preis)} (${e.absender ?? EINGANGSQUELLEN[e.quelle]})`,
      );
    }
    schliessen();
  }

  return (
    <Dialog
      titel="Angebot erfassen"
      unterzeile="Mailtext einfügen — erkannt wird, was sich sicher lesen lässt. Den Rest von Hand."
      schliessen={schliessen}
    >
      <div className="flex flex-col gap-3">
        <textarea
          autoFocus
          rows={6}
          value={text}
          onChange={(ev) => auslesen(ev.target.value)}
          placeholder="Mailtext oder ImmoMetrica-Treffer hier einfügen …"
          aria-label="Mailtext"
          className="w-full resize-y rounded-xl border border-linie bg-flaeche px-3 py-2.5 text-[0.76rem] leading-relaxed text-tinte focus:border-linie-stark focus:outline-none"
        />
        {bekannt && (
          <p className="flex items-center gap-2 rounded-xl bg-[#E4EAF2] px-3 py-2 text-[0.72rem] text-[#38506E]">
            <History size={13} />
            Bekannt seit {f.datum(bekannt.seit)}
            {bekannt.damals ? `, damals ${f.eur(bekannt.damals)}` : ""}
            {bekannt.objekt && e.preis ? " — die neue Preisnennung wird ans Objekt gehängt." : ""}
          </p>
        )}
        <div className="grid gap-2.5 sm:grid-cols-[2fr_1fr_1fr]">
          <input
            className={feld}
            aria-label="Straße und Hausnummer"
            placeholder="Straße und Hausnummer"
            value={e.strasse}
            onChange={(ev) => setze({ strasse: ev.target.value })}
          />
          <input
            className={feld}
            aria-label="PLZ"
            placeholder="PLZ"
            value={e.plz}
            onChange={(ev) => setze({ plz: ev.target.value })}
          />
          <input
            className={feld}
            aria-label="Ort"
            placeholder="Ort"
            value={e.stadt}
            onChange={(ev) => setze({ stadt: ev.target.value })}
          />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <input
            className={cn(feld, "zahl")}
            aria-label="Preis"
            placeholder="Preis €"
            inputMode="decimal"
            value={e.preis ?? ""}
            onChange={(ev) => setze({ preis: zahl(ev.target.value) })}
          />
          <input
            className={cn(feld, "zahl")}
            aria-label="Fläche"
            placeholder="m²"
            inputMode="decimal"
            value={e.flaeche ?? ""}
            onChange={(ev) => setze({ flaeche: zahl(ev.target.value) })}
          />
          <input
            className={cn(feld, "zahl")}
            aria-label="Zimmer"
            placeholder="Zimmer"
            inputMode="decimal"
            value={e.zimmer ?? ""}
            onChange={(ev) => setze({ zimmer: zahl(ev.target.value) })}
          />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <select
            className={feld}
            aria-label="Objektart"
            value={e.objektart ?? ""}
            onChange={(ev) => setze({ objektart: (ev.target.value || null) as Objektart | null })}
          >
            <option value="">Objektart …</option>
            {Object.entries(OBJEKTARTEN).map(([w, t]) => (
              <option key={w} value={w}>
                {t}
              </option>
            ))}
          </select>
          <input
            className={feld}
            aria-label="Absender"
            placeholder="Absender / Makler"
            value={e.absender ?? ""}
            onChange={(ev) => setze({ absender: ev.target.value || null })}
          />
          <select
            className={feld}
            aria-label="Quelle"
            value={e.quelle}
            onChange={(ev) => setze({ quelle: ev.target.value as Eingangsquelle })}
          >
            {Object.entries(EINGANGSQUELLEN).map(([w, t]) => (
              <option key={w} value={w}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[0.72rem] text-grau-stark">
          <FileText size={13} />
          {e.expose ? e.expose.name : "Exposé anhängen (PDF)"}
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(ev) => {
              const d = ev.target.files?.[0];
              if (d) setze({ expose: { name: d.name, vorschau: URL.createObjectURL(d) } });
            }}
          />
        </label>
        <div className="mt-2 flex justify-end gap-2.5 border-t border-linie pt-4">
          <button
            type="button"
            onClick={schliessen}
            className="druckbar rounded-full px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={speichern}
            disabled={!e.strasse.trim()}
            className="druckbar flex items-center gap-1.5 rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-grund disabled:opacity-30"
          >
            In den Eingang
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Archiv                                                               */
/* ------------------------------------------------------------------ */

function Archiv({ oeffneObjekt }: { oeffneObjekt: (id: string) => void }) {
  const { eingaenge, zuruecknehmen } = useEingang();
  const { objekte } = useObjekte();
  const [suche, setSuche] = useState("");
  const [status, setStatus] = useState<"" | "interessant" | "aussortiert">("");
  const [preisVon, setPreisVon] = useState("");
  const [preisBis, setPreisBis] = useState("");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");

  const zahl = (v: string) => (v.trim() === "" ? null : Number(v.replace(/\./g, "")) || null);
  const liste = eingaenge
    .filter((e) => e.status !== "offen")
    .filter((e) => {
      const b = suche.trim().toLowerCase();
      if (status && e.status !== status) return false;
      if (
        b &&
        ![e.strasse, e.stadtteil, e.stadt, e.absender, e.grund].join(" ").toLowerCase().includes(b)
      )
        return false;
      const pv = zahl(preisVon);
      const pb = zahl(preisBis);
      if (pv !== null && (e.preis ?? 0) < pv) return false;
      if (pb !== null && (e.preis ?? Infinity) > pb) return false;
      if (von && e.eingangAm.slice(0, 10) < von) return false;
      if (bis && e.eingangAm.slice(0, 10) > bis) return false;
      return true;
    })
    .sort((a, b) => b.eingangAm.localeCompare(a.eingangAm));

  const feld =
    "h-8 rounded-full border border-linie bg-flaeche px-3 text-[0.72rem] text-tinte focus:border-linie-stark focus:outline-none";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search
            size={12}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-grau"
          />
          <input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Adresse, Stadtteil, Makler, Grund"
            aria-label="Archiv durchsuchen"
            className={cn(feld, "w-64 pl-8")}
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="Status"
          className={feld}
        >
          <option value="">Alle gesichteten</option>
          <option value="interessant">Interessant</option>
          <option value="aussortiert">Aussortiert</option>
        </select>
        <input
          value={preisVon}
          onChange={(e) => setPreisVon(e.target.value)}
          placeholder="Preis von"
          aria-label="Preis von"
          inputMode="numeric"
          className={cn(feld, "zahl w-28")}
        />
        <input
          value={preisBis}
          onChange={(e) => setPreisBis(e.target.value)}
          placeholder="Preis bis"
          aria-label="Preis bis"
          inputMode="numeric"
          className={cn(feld, "zahl w-28")}
        />
        <input
          type="date"
          value={von}
          onChange={(e) => setVon(e.target.value)}
          aria-label="Eingang ab"
          className={cn(feld, "zahl")}
        />
        <input
          type="date"
          value={bis}
          onChange={(e) => setBis(e.target.value)}
          aria-label="Eingang bis"
          className={cn(feld, "zahl")}
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-linie bg-flaeche">
        <table className="w-full min-w-[46rem] text-left text-[0.76rem]">
          <thead>
            <tr className="bg-flaeche-hoch text-[0.6rem] font-semibold tracking-[0.14em] text-grau uppercase">
              <th className="px-3 py-2">Eingang</th>
              <th className="px-3 py-2">Adresse</th>
              <th className="px-3 py-2 text-right">Preis</th>
              <th className="px-3 py-2 text-right">m²</th>
              <th className="px-3 py-2">Absender</th>
              <th className="px-3 py-2">Ergebnis</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {liste.map((e) => {
              const o: Objekt | undefined = objekte.find((x) => x.id === e.objektId);
              return (
                <tr key={e.id} className="border-t border-linie">
                  <td className="zahl px-3 py-2 text-grau">{f.datum(e.eingangAm)}</td>
                  <td className="px-3 py-2 text-tinte">
                    {e.strasse}
                    <span className="text-grau">
                      {" "}
                      · {e.stadt}
                      {e.stadtteil ? ` ${e.stadtteil}` : ""}
                    </span>
                  </td>
                  <td className="zahl px-3 py-2 text-right">{f.eur(e.preis)}</td>
                  <td className="zahl px-3 py-2 text-right text-grau-stark">{e.flaeche ?? ""}</td>
                  <td className="px-3 py-2 text-grau-stark">
                    {e.absender ?? EINGANGSQUELLEN[e.quelle]}
                  </td>
                  <td className="px-3 py-2">
                    {e.status === "interessant" ? (
                      <button
                        type="button"
                        onClick={() => o && oeffneObjekt(o.id)}
                        className="druckbar rounded-full bg-[#DBF2E6] px-2 py-0.5 text-[0.62rem] font-semibold text-[#0C5E3A]"
                      >
                        interessant{o ? ` · ${STUFEN[o.stufe].titel}` : ""}
                      </button>
                    ) : (
                      <span className="rounded-full bg-[#FBE2E2] px-2 py-0.5 text-[0.62rem] font-semibold text-[#9A2727]">
                        aussortiert{e.grund ? ` · ${e.grund}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => zuruecknehmen(e.id)}
                      className="druckbar text-[0.64rem] text-grau hover:text-tinte"
                    >
                      zurück in den Eingang
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {liste.length === 0 && (
          <p className="px-3 py-6 text-center text-[0.74rem] text-grau">Nichts gefunden.</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Suchprofil (Einstellungen)                                           */
/* ------------------------------------------------------------------ */

export function SuchprofilPflegen() {
  const { suchprofil: p, suchprofilSetzen } = useEingang();
  const setze = (teil: Partial<Suchprofil>) => suchprofilSetzen({ ...p, ...teil });
  const umschalten = <T,>(liste: T[], wert: T) =>
    liste.includes(wert) ? liste.filter((x) => x !== wert) : [...liste, wert];
  const zahl = (v: string) => {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return v.trim() === "" || !Number.isFinite(n) ? null : n;
  };
  const chip = (aktiv: boolean) =>
    cn(
      "druckbar rounded-full border px-3 py-1 text-[0.68rem] whitespace-nowrap",
      aktiv ? "border-tinte bg-tinte text-grund" : "border-linie bg-flaeche text-grau-stark",
    );
  const feld =
    "zahl h-9 w-36 rounded-xl border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";
  const teile = STADTTEIL_NAMEN.filter((s) => p.staedte.includes(s.stadt));

  return (
    <div className="mt-5 flex max-w-3xl flex-col gap-5">
      <div>
        <div className="mini-label mb-2">Orte</div>
        <div className="flex flex-wrap gap-1.5">
          {(["Ulm", "Neu-Ulm"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={p.staedte.includes(s)}
              onClick={() => {
                const staedte = umschalten(p.staedte, s);
                setze({
                  staedte,
                  stadtteile: p.stadtteile.filter((t) =>
                    STADTTEIL_NAMEN.some((x) => x.name === t && staedte.includes(x.stadt)),
                  ),
                });
              }}
              className={chip(p.staedte.includes(s))}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mini-label mb-2">
          Stadtteile{" "}
          <span className="tracking-normal normal-case">
            — {p.stadtteile.length ? `${p.stadtteile.length} gewählt` : "alle"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {teile.map((s) => (
            <button
              key={`${s.stadt}-${s.name}`}
              type="button"
              aria-pressed={p.stadtteile.includes(s.name)}
              onClick={() => setze({ stadtteile: umschalten(p.stadtteile, s.name) })}
              className={chip(p.stadtteile.includes(s.name))}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mini-label mb-2">Objektarten</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(OBJEKTARTEN) as [Objektart, string][]).map(([w, t]) => (
            <button
              key={w}
              type="button"
              aria-pressed={p.objektarten.includes(w)}
              onClick={() => setze({ objektarten: umschalten(p.objektarten, w) })}
              className={chip(p.objektarten.includes(w))}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {(
          [
            ["maxPreisJeQm", "Höchstens €/m²"],
            ["preisVon", "Preis ab €"],
            ["preisBis", "Preis bis €"],
          ] as const
        ).map(([k, t]) => (
          <label key={k} className="flex flex-col gap-1.5">
            <span className="mini-label">{t}</span>
            <input
              className={feld}
              inputMode="numeric"
              aria-label={t}
              defaultValue={p[k] ?? ""}
              onBlur={(ev) => setze({ [k]: zahl(ev.target.value) })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
