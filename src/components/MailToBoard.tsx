/**
 * Mail to Board — der Dialog im Backoffice.
 *
 * Oben die Board-Adresse (Phase 2: Mails dorthin landen von selbst im
 * Posteingang). Darunter das, was heute schon geht: Mailtext einfügen oder
 * eine .eml-Datei wählen bzw. aufs Board ziehen. Erkannt werden Betreff,
 * Absender, Datum, Anhänge und — über Kürzel oder Adresse — das Objekt.
 */
import { ArrowRight, Copy, FileText, Mail as MailZeichen, Paperclip } from "lucide-react";
import { useMemo, useState } from "react";

import { KARTENARTEN, artAusName } from "../lib/backoffice";
import { useBackoffice } from "../lib/backofficeStore";
import {
  BOARD_ADRESSE,
  emlAuslesen,
  mailtextAuslesen,
  objektInMail,
  type Mail,
} from "../lib/mailToBoard";
import { f, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { Dialog } from "./Dialog";

/** .eml lesen und als Mail zurückgeben — für Dialog und Drag & Drop. */
export async function emlDateiLesen(datei: File): Promise<Mail> {
  return emlAuslesen(await datei.text());
}

export function istEml(datei: File) {
  return /\.eml$/i.test(datei.name) || datei.type === "message/rfc822";
}

const objektTitel = (o: Objekt) =>
  `${o.kuerzel ? `${o.kuerzel} · ` : ""}${o.bezeichnung?.trim() || o.strasse}`;

export function MailToBoardDialog({
  vorab,
  schliessen,
  angelegt,
}: {
  /** Schon gelesene Mail, etwa aus einer aufs Board gezogenen .eml. */
  vorab?: Mail | null;
  schliessen: () => void;
  angelegt: (kartenId: string) => void;
}) {
  const { mailAufnehmen } = useBackoffice();
  const { objekte } = useObjekte();
  const [text, setText] = useState("");
  const [eml, setEml] = useState<Mail | null>(vorab ?? null);
  const [betreff, setBetreff] = useState<string | null>(null);
  const [objektWahl, setObjektWahl] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState(false);

  const mail = useMemo<Mail | null>(() => {
    const basis = eml ?? (text.trim() ? mailtextAuslesen(text) : null);
    if (!basis) return null;
    return betreff !== null ? { ...basis, betreff: betreff || null } : basis;
  }, [eml, text, betreff]);

  const erkannt = mail ? objektInMail(mail, objekte) : null;
  const objektId = objektWahl ?? erkannt?.id ?? "";

  function speichern() {
    if (!mail) return;
    const k = mailAufnehmen(mail, objektId || null);
    angelegt(k.id);
  }

  const feld =
    "h-9 w-full rounded-xl border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";

  return (
    <Dialog
      titel="Mail to Board"
      unterzeile="Aus einer Mail wird eine Karte im Posteingang — Anhang als Datei, Text als Notiz."
      schliessen={schliessen}
    >
      <div className="flex flex-col gap-4">
        {/* ----- Board-Adresse ----- */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-flaeche-hoch px-3 py-2.5">
          <MailZeichen size={14} className="shrink-0 text-grau-stark" />
          <span className="zahl min-w-0 flex-1 truncate text-[0.78rem] text-tinte">
            {BOARD_ADRESSE}
          </span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(BOARD_ADRESSE).then(() => setKopiert(true));
            }}
            className="druckbar flex items-center gap-1.5 rounded-full border border-linie px-2.5 py-1 text-[0.64rem] font-semibold text-grau-stark hover:text-tinte"
          >
            <Copy size={11} />
            {kopiert ? "Kopiert" : "Kopieren"}
          </button>
          <p className="w-full text-[0.64rem] leading-relaxed text-grau">
            Weiterleiten an diese Adresse legt die Karte ab Phase 2 automatisch an. Bis dahin: Mail
            hier einfügen oder die .eml-Datei aufs Board ziehen.
          </p>
        </div>

        {/* ----- Eingabe ----- */}
        {eml ? (
          <div className="flex items-center gap-2 rounded-xl border border-linie px-3 py-2.5 text-[0.74rem] text-grau-stark">
            <FileText size={14} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">.eml gelesen</span>
            <button
              type="button"
              onClick={() => {
                setEml(null);
                setBetreff(null);
              }}
              className="druckbar text-[0.66rem] font-semibold text-tinte"
            >
              Stattdessen Text einfügen
            </button>
          </div>
        ) : (
          <>
            <textarea
              autoFocus
              rows={7}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setBetreff(null);
              }}
              placeholder={"Von: …\nBetreff: …\n\nMailtext hier einfügen"}
              aria-label="Mailtext"
              className="w-full resize-y rounded-xl border border-linie bg-flaeche px-3 py-2.5 text-[0.76rem] leading-relaxed text-tinte focus:border-linie-stark focus:outline-none"
            />
            <label className="flex cursor-pointer items-center gap-2 text-[0.72rem] text-grau-stark hover:text-tinte">
              <Paperclip size={13} />
              Oder .eml-Datei wählen
              <input
                type="file"
                accept=".eml,message/rfc822"
                className="hidden"
                onChange={async (e) => {
                  const d = e.target.files?.[0];
                  if (d) setEml(await emlDateiLesen(d));
                  e.target.value = "";
                }}
              />
            </label>
          </>
        )}

        {/* ----- Erkannt ----- */}
        {mail && (
          <div className="flex flex-col gap-2.5 border-t border-linie pt-4">
            <label className="flex flex-col gap-1.5">
              <span className="mini-label">Titel der Karte</span>
              <input
                className={feld}
                value={mail.betreff ?? ""}
                onChange={(e) => setBetreff(e.target.value)}
                aria-label="Titel der Karte"
              />
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="mini-label">Objekt</span>
                <select
                  className={feld}
                  value={objektId}
                  onChange={(e) => setObjektWahl(e.target.value)}
                  aria-label="Objekt"
                >
                  <option value="">Ohne Objekt</option>
                  {objekte.map((o) => (
                    <option key={o.id} value={o.id}>
                      {objektTitel(o)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="mini-label">Erkannt</span>
                <div className="text-[0.72rem] leading-relaxed text-grau-stark">
                  {KARTENARTEN[
                    artAusName(
                      `${mail.betreff ?? ""} ${mail.anhaenge.map((a) => a.name).join(" ")}`,
                    )
                  ] ?? "Sonstiges"}
                  {mail.absender || mail.absenderEmail
                    ? ` · von ${mail.absender ?? mail.absenderEmail}`
                    : ""}
                  {mail.datum ? ` · ${f.datum(mail.datum)}` : ""}
                  {erkannt && !objektWahl ? " · Objekt aus dem Text" : ""}
                </div>
              </div>
            </div>
            {mail.anhaenge.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {mail.anhaenge.map((a, i) => (
                  <span
                    key={`${a.name}-${i}`}
                    className="flex items-center gap-1 rounded-full bg-flaeche-hoch px-2.5 py-1 text-[0.64rem] text-grau-stark"
                  >
                    <Paperclip size={10} />
                    {a.name}
                    {i === 0 && " (wird Datei der Karte)"}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2.5 border-t border-linie pt-4">
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
            disabled={!mail}
            className="druckbar flex items-center gap-1.5 rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-grund disabled:opacity-30"
          >
            Aufs Board
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </Dialog>
  );
}
