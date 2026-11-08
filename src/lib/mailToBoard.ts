/**
 * Mail to Board: aus einer Mail eine Backoffice-Karte.
 *
 * Phase 1 ohne Backend: Mailtext einfügen oder eine .eml-Datei aufs Board
 * ziehen. Phase 2: Mails an die Board-Adresse landen von selbst im Posteingang
 * — derselbe Ausleser läuft dann auf dem Server.
 *
 * Wie beim Ankauf-Eingang gilt: lieber leer als falsch.
 */
import { adresseNormalisieren } from "./eingang";
import type { Objekt } from "./objekte";

/** Platzhalter bis Phase 2 — dann die echte Eingangsadresse des Boards. */
export const BOARD_ADRESSE = "backoffice@revest-projekt.de";

export interface Mailanhang {
  name: string;
  typ: string;
  /** Nur bei .eml mit eingebettetem Anhang (base64). */
  inhalt: Uint8Array | null;
}

export interface Mail {
  betreff: string | null;
  absender: string | null;
  absenderEmail: string | null;
  datum: string | null;
  text: string;
  anhaenge: Mailanhang[];
}

/* ------------------------------------------------------------------ */
/* Kodierungen                                                          */
/* ------------------------------------------------------------------ */

function bytesAlsText(bytes: Uint8Array, zeichensatz = "utf-8"): string {
  try {
    return new TextDecoder(zeichensatz).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function base64Bytes(b64: string): Uint8Array {
  const rein = atob(b64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(rein.length);
  for (let i = 0; i < rein.length; i++) bytes[i] = rein.charCodeAt(i);
  return bytes;
}

function quotedPrintable(text: string, zeichensatz: string): string {
  const ohneUmbruch = text.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < ohneUmbruch.length; i++) {
    const z = ohneUmbruch[i];
    if (z === "=" && /^[0-9A-F]{2}$/i.test(ohneUmbruch.slice(i + 1, i + 3))) {
      bytes.push(parseInt(ohneUmbruch.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(z));
    }
  }
  return bytesAlsText(new Uint8Array(bytes), zeichensatz);
}

/** „=?UTF-8?Q?Rechnung_M=C3=A4rz?=“ → „Rechnung März“. */
export function kopfzeileEntschluesseln(wert: string): string {
  return wert
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([QB])\?([^?]*)\?=/gi, (_, zs: string, art: string, inhalt: string) =>
      art.toUpperCase() === "B"
        ? bytesAlsText(base64Bytes(inhalt), zs)
        : quotedPrintable(inhalt.replace(/_/g, " "), zs),
    );
}

/* ------------------------------------------------------------------ */
/* Kopf und Teile                                                       */
/* ------------------------------------------------------------------ */

function kopfLesen(roh: string): { kopf: Record<string, string>; rumpf: string } {
  const teilung = roh.search(/\r?\n\r?\n/);
  const kopfText = teilung >= 0 ? roh.slice(0, teilung) : roh;
  const rumpf = teilung >= 0 ? roh.slice(teilung).replace(/^\r?\n\r?\n/, "") : "";
  const kopf: Record<string, string> = {};
  // Fortsetzungszeilen beginnen mit Leerraum.
  for (const zeile of kopfText.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const m = zeile.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (m) kopf[m[1].toLowerCase()] = m[2];
  }
  return { kopf, rumpf };
}

function parameter(kopfwert: string | undefined, name: string): string | null {
  if (!kopfwert) return null;
  const m = kopfwert.match(new RegExp(`${name}\\*?=\\s*"?([^";]+)"?`, "i"));
  return m ? kopfzeileEntschluesseln(m[1].replace(/^utf-8''/i, "")) : null;
}

function teilDekodieren(kopf: Record<string, string>, rumpf: string): string {
  const zs = parameter(kopf["content-type"], "charset") ?? "utf-8";
  const kodierung = (kopf["content-transfer-encoding"] ?? "").toLowerCase();
  if (kodierung === "base64") return bytesAlsText(base64Bytes(rumpf), zs);
  if (kodierung === "quoted-printable") return quotedPrintable(rumpf, zs);
  return rumpf;
}

function htmlAlsText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Läuft rekursiv durch multipart/* und sammelt Text und Anhänge. */
function teileSammeln(
  kopf: Record<string, string>,
  rumpf: string,
  ziel: { klar: string[]; html: string[]; anhaenge: Mailanhang[] },
) {
  const typ = (kopf["content-type"] ?? "text/plain").toLowerCase();
  const grenze = parameter(kopf["content-type"], "boundary");
  if (typ.startsWith("multipart/") && grenze) {
    for (const stueck of rumpf.split(`--${grenze}`).slice(1)) {
      if (stueck.startsWith("--")) break;
      const t = kopfLesen(stueck.replace(/^\r?\n/, ""));
      teileSammeln(t.kopf, t.rumpf, ziel);
    }
    return;
  }
  const dateiname =
    parameter(kopf["content-disposition"], "filename") ?? parameter(kopf["content-type"], "name");
  const istAnhang = /attachment/i.test(kopf["content-disposition"] ?? "") || Boolean(dateiname);
  if (istAnhang && dateiname) {
    const b64 = (kopf["content-transfer-encoding"] ?? "").toLowerCase() === "base64";
    let inhalt: Uint8Array | null = null;
    try {
      inhalt = b64 ? base64Bytes(rumpf) : null;
    } catch {
      inhalt = null;
    }
    ziel.anhaenge.push({ name: dateiname, typ: typ.split(";")[0], inhalt });
  } else if (typ.startsWith("text/html")) {
    ziel.html.push(teilDekodieren(kopf, rumpf));
  } else if (typ.startsWith("text/")) {
    ziel.klar.push(teilDekodieren(kopf, rumpf));
  }
}

function absenderLesen(wert: string | null | undefined): Pick<Mail, "absender" | "absenderEmail"> {
  if (!wert) return { absender: null, absenderEmail: null };
  const w = kopfzeileEntschluesseln(wert).trim();
  const mitName = w.match(/^"?([^"<]*?)"?\s*<([^>]+@[^>]+)>/);
  if (mitName) return { absender: mitName[1].trim() || null, absenderEmail: mitName[2].trim() };
  const nurMail = w.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return { absender: nurMail ? null : w || null, absenderEmail: nurMail?.[0] ?? null };
}

function datumLesen(wert: string | undefined): string | null {
  if (!wert) return null;
  // Deutsch zuerst: „05.11.2026 14:30“ liest der Browser sonst als 11. Mai.
  const m = wert.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,um]+(\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0)).toISOString();
  const d = new Date(wert);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Einstieg                                                             */
/* ------------------------------------------------------------------ */

/** Rohe .eml (RFC 822/MIME). */
export function emlAuslesen(roh: string): Mail {
  const { kopf, rumpf } = kopfLesen(roh);
  const ziel = { klar: [] as string[], html: [] as string[], anhaenge: [] as Mailanhang[] };
  teileSammeln(kopf, rumpf, ziel);
  const text = (ziel.klar.join("\n\n") || htmlAlsText(ziel.html.join("\n"))).trim();
  return {
    betreff: kopf.subject ? kopfzeileEntschluesseln(kopf.subject).trim() || null : null,
    ...absenderLesen(kopf.from),
    datum: datumLesen(kopf.date),
    text,
    anhaenge: ziel.anhaenge,
  };
}

/**
 * Eingefügter Mailtext — so, wie ihn Outlook, Apple Mail oder Gmail beim
 * Kopieren liefern: oben Von/Betreff/Datum (deutsch oder englisch), dann Text.
 */
export function mailtextAuslesen(roh: string): Mail {
  const zeilen = roh.replace(/\r/g, "").split("\n");
  const kopf: Record<string, string> = {};
  let i = 0;
  // Leerzeilen vor dem Kopf überspringen, dann so lange Kopfzeilen lesen,
  // wie sie wie Kopfzeilen aussehen.
  while (i < zeilen.length && !zeilen[i].trim()) i++;
  for (; i < zeilen.length; i++) {
    const m = zeilen[i].match(
      /^(von|from|an|to|cc|betreff|subject|datum|date|gesendet|sent)\s*:\s*(.*)$/i,
    );
    if (!m) break;
    const schluessel = m[1].toLowerCase();
    const norm =
      schluessel === "from"
        ? "von"
        : schluessel === "subject"
          ? "betreff"
          : schluessel === "date" || schluessel === "gesendet" || schluessel === "sent"
            ? "datum"
            : schluessel;
    kopf[norm] = m[2].trim();
  }
  const text = zeilen.slice(i).join("\n").trim();
  // Ohne Betreff-Zeile: die erste Textzeile, wenn sie kurz genug ist.
  const ersteZeile =
    text
      .split("\n")
      .find((z) => z.trim())
      ?.trim() ?? "";
  return {
    betreff: kopf.betreff || (ersteZeile.length <= 80 ? ersteZeile || null : null),
    ...absenderLesen(kopf.von),
    datum: datumLesen(kopf.datum),
    text,
    anhaenge: [],
  };
}

/** Gehört die Mail zu einem Objekt? Kürzel oder Straße mit Hausnummer im Text. */
export function objektInMail(mail: Mail, objekte: Objekt[]): Objekt | null {
  const roh = `${mail.betreff ?? ""}\n${mail.text}\n${mail.anhaenge.map((a) => a.name).join(" ")}`;
  const normal = adresseNormalisieren(roh);
  for (const o of objekte) {
    if (o.kuerzel && new RegExp(`\\b${o.kuerzel}\\b`, "i").test(roh)) return o;
  }
  for (const o of objekte) {
    const s = adresseNormalisieren(o.strasse);
    if (s.length < 6 || !/\d$/.test(s)) continue;
    // „Rebhangweg 9“ darf nicht in „Rebhangweg 91“ stecken.
    for (let i = normal.indexOf(s); i >= 0; i = normal.indexOf(s, i + 1)) {
      if (!/\d/.test(normal[i + s.length] ?? "")) return o;
    }
  }
  return null;
}
