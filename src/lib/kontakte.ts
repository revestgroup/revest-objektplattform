/**
 * Kontaktregister — ersetzt das monday-Board „Kontakte“.
 *
 * Ein Kontakt existiert einmal, egal an wie vielen Objekten er hängt: ein
 * Makler mit zwölf Objekten ist ein Datensatz, und an seiner Karte sieht man
 * alle zwölf. Das Objekt verweist nur (`Kontakt.kontaktId` + Rolle) und hält
 * eine Kopie von Name, Telefon und E-Mail, die das Register aktuell hält.
 */
import type { Kontakt, Kontaktrolle, Objekt } from "./objekte";

/* ------------------------------------------------------------------ */
/* Kategorien und Status                                                */
/* ------------------------------------------------------------------ */

export type Kategoriegruppe = "ankauf" | "kapital" | "abwicklung" | "sonstiges";

export const KATEGORIEGRUPPEN: Record<
  Kategoriegruppe,
  { titel: string; farbe: string; weich: string; tief: string }
> = {
  ankauf: { titel: "Ankauf / Quellen", farbe: "#C79A3E", weich: "#F7EEDB", tief: "#6E5212" },
  kapital: { titel: "Kapital / Käufer", farbe: "#5E8F7A", weich: "#E2EFE9", tief: "#2D5646" },
  abwicklung: { titel: "Objekt / Abwicklung", farbe: "#6F86A6", weich: "#E4EAF2", tief: "#38506E" },
  sonstiges: { titel: "Sonstiges", farbe: "#9A9A9A", weich: "#EDEDED", tief: "#555555" },
};

export interface Kategorie {
  titel: string;
  gruppe: Kategoriegruppe;
}

/** Aus monday übernommen. In den Einstellungen erweiterbar. */
export const STANDARD_KATEGORIEN: Kategorie[] = [
  { titel: "Makler", gruppe: "ankauf" },
  { titel: "Eigentümer", gruppe: "ankauf" },
  { titel: "Tippgeber", gruppe: "ankauf" },
  { titel: "Projektentwickler", gruppe: "ankauf" },
  { titel: "Insolvenzverwalter", gruppe: "ankauf" },
  { titel: "Genossenschaft / Wohnungsbaugesellschaft", gruppe: "ankauf" },
  { titel: "Immobilieninvestor", gruppe: "kapital" },
  { titel: "Family Office", gruppe: "kapital" },
  { titel: "Kaufinteressent", gruppe: "kapital" },
  { titel: "Bank", gruppe: "kapital" },
  { titel: "Finanzberater", gruppe: "kapital" },
  { titel: "Hausverwaltung", gruppe: "abwicklung" },
  { titel: "Notar", gruppe: "abwicklung" },
  { titel: "Handwerker / Dienstleister", gruppe: "abwicklung" },
  { titel: "Versicherung", gruppe: "abwicklung" },
  { titel: "Versorger", gruppe: "abwicklung" },
  { titel: "Amt / Behörde", gruppe: "abwicklung" },
  { titel: "Berater (Anwalt, Steuer)", gruppe: "abwicklung" },
  { titel: "Sonstiges", gruppe: "sonstiges" },
];

export type Kontaktstatus = "neu" | "todo" | "kontaktiert" | "aktiv" | "inaktiv";

export const KONTAKTSTATUS: Record<Kontaktstatus, { titel: string; weich: string; tief: string }> =
  {
    neu: { titel: "Neu", weich: "#E4EAF2", tief: "#38506E" },
    todo: { titel: "ToDo", weich: "#FBEBD1", tief: "#8A5A08" },
    kontaktiert: { titel: "Kontaktiert", weich: "#F1F3F6", tief: "#424954" },
    aktiv: { titel: "Aktiv", weich: "#DBF2E6", tief: "#0C5E3A" },
    inaktiv: { titel: "Inaktiv", weich: "#EDEDED", tief: "#777777" },
  };

/** Welche Kategorie eine Rolle am Objekt im Register bekommt. */
const KATEGORIE_DER_ROLLE: Record<Kontaktrolle, string> = {
  eigentuemer: "Eigentümer",
  makler: "Makler",
  verwalter: "Hausverwaltung",
  notar: "Notar",
  handwerker: "Handwerker / Dienstleister",
  sonst: "Sonstiges",
};

/* ------------------------------------------------------------------ */
/* Datensatz                                                            */
/* ------------------------------------------------------------------ */

export interface Kontaktnotiz {
  id: string;
  zeitpunkt: string;
  text: string;
  verfasser?: string | null;
}

export interface Kontaktdatensatz {
  id: string;
  /** Person. Bei reinen Firmenkontakten leer. */
  name: string;
  /** Freitext mit Vorschlägen aus bestehenden Firmennamen — keine eigenen Firmen-Datensätze. */
  firma: string | null;
  kategorien: string[];
  telefon: string | null;
  mobil: string | null;
  email: string | null;
  ort: string | null;
  status: Kontaktstatus;
  quelle: string | null;
  notizen: Kontaktnotiz[];
  /** Von Hand gesetzt; sonst gilt die jüngste Notiz. */
  letzterKontakt: string | null;
  angelegtAm: string;
  /** Postanschrift, z. B. aus einer Eigentümerliste. */
  anschrift?: string | null;
  /** Ausdrücklich keine Ansprache — gilt vor jeder Kampagne. */
  kontaktNichtGewuenscht?: boolean;
}

/** Wie der Kontakt am Objekt heißt: „Firma, Person“ oder was es gibt. */
export function anzeigename(k: Pick<Kontaktdatensatz, "name" | "firma">): string {
  const name = k.name.trim();
  const firma = k.firma?.trim() ?? "";
  if (firma && name) return `${firma}, ${name}`;
  return firma || name;
}

export function letzterKontaktVon(k: Kontaktdatensatz): string | null {
  const notiz =
    [...k.notizen].sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt))[0]?.zeitpunkt ?? null;
  if (!k.letzterKontakt) return notiz;
  if (!notiz) return k.letzterKontakt;
  return k.letzterKontakt > notiz ? k.letzterKontakt : notiz;
}

/** Alle Objekte, an denen der Kontakt hängt, mit seiner Rolle dort. */
export function objekteVon(
  kontaktId: string,
  objekte: Objekt[],
): { objekt: Objekt; rolle: Kontaktrolle }[] {
  return objekte.flatMap((o) =>
    o.kontakte.filter((k) => k.kontaktId === kontaktId).map((k) => ({ objekt: o, rolle: k.rolle })),
  );
}

/* ------------------------------------------------------------------ */
/* Übernahme und Dubletten                                              */
/* ------------------------------------------------------------------ */

const ziffern = (t: string | null | undefined) => (t ?? "").replace(/\D/g, "");
const klein = (t: string | null | undefined) => (t ?? "").trim().toLowerCase();

/** Gleicher Mensch? E-Mail, dann Telefon, dann Name. */
export function istDerselbe(
  a: Kontaktdatensatz,
  b: { name: string; telefon: string | null; email: string | null },
): boolean {
  if (b.email && klein(a.email) === klein(b.email)) return true;
  const tel = ziffern(b.telefon);
  if (tel.length >= 6 && (ziffern(a.telefon) === tel || ziffern(a.mobil) === tel)) return true;
  return klein(anzeigename(a)) === klein(b.name) && klein(b.name) !== "";
}

/**
 * „Brandt & Partner, Herr Ostermann“ → Firma „Brandt & Partner“, Name „Herr
 * Ostermann“. Nur wenn hinter dem Komma eine Anrede steht — „Notariat Dr.
 * Winterberg, Ulm“ bleibt ein Name.
 */
export function nameZerlegen(roh: string): { name: string; firma: string | null } {
  const treffer = roh.match(/^(.+?),\s*((?:Herr|Frau|Hr\.|Fr\.)\s.+)$/);
  return treffer
    ? { firma: treffer[1].trim(), name: treffer[2].trim() }
    : { firma: null, name: roh.trim() };
}

let zaehler = 0;
export function neueKontaktId(): string {
  zaehler += 1;
  return `k-${Date.now().toString(36)}-${zaehler}`;
}

export function neuerDatensatz(teil: Partial<Kontaktdatensatz> = {}): Kontaktdatensatz {
  return {
    id: neueKontaktId(),
    name: "",
    firma: null,
    kategorien: [],
    telefon: null,
    mobil: null,
    email: null,
    ort: null,
    status: "neu",
    quelle: null,
    notizen: [],
    letzterKontakt: null,
    angelegtAm: new Date().toISOString(),
    ...teil,
  };
}

/**
 * Bringt Objekt-Kontakte ins Register: jeder Kontakt ohne `kontaktId` wird
 * einem bestehenden Datensatz zugeordnet (Dublette) oder legt einen an.
 * Danach ziehen alle Kopien am Objekt die Stammdaten aus dem Register.
 */
export function registerAbgleichen(
  objekte: Objekt[],
  register: Kontaktdatensatz[],
): { objekte: Objekt[]; register: Kontaktdatensatz[] } {
  const reg = register.map((r) => ({ ...r, kategorien: [...r.kategorien] }));

  const verknuepft = objekte.map((o) => ({
    ...o,
    kontakte: (o.kontakte ?? []).map((k) => {
      if (k.kontaktId && reg.some((r) => r.id === k.kontaktId)) return k;
      if (!k.name.trim()) return k;
      let ziel = reg.find((r) => istDerselbe(r, k));
      const kategorie = KATEGORIE_DER_ROLLE[k.rolle];
      if (!ziel) {
        ziel = neuerDatensatz({
          ...nameZerlegen(k.name),
          telefon: k.telefon,
          email: k.email,
          kategorien: [kategorie],
          status: "kontaktiert",
          quelle: "Übernahme aus Objekt",
        });
        reg.push(ziel);
      } else {
        if (!ziel.kategorien.includes(kategorie)) ziel.kategorien.push(kategorie);
        ziel.telefon ??= k.telefon;
        ziel.email ??= k.email;
      }
      return { ...k, kontaktId: ziel.id };
    }),
  }));

  return { objekte: verknuepft.map((o) => kopienAktualisieren(o, reg)), register: reg };
}

/** Name, Telefon und E-Mail an den Objekt-Kontakten aus dem Register nachziehen. */
export function kopienAktualisieren(o: Objekt, register: Kontaktdatensatz[]): Objekt {
  let geaendert = false;
  const kontakte = o.kontakte.map((k): Kontakt => {
    const r = k.kontaktId ? register.find((x) => x.id === k.kontaktId) : undefined;
    if (!r) return k;
    const name = anzeigename(r);
    const telefon = r.telefon ?? r.mobil;
    if (k.name === name && k.telefon === telefon && k.email === r.email) return k;
    geaendert = true;
    return { ...k, name, telefon, email: r.email };
  });
  return geaendert ? { ...o, kontakte } : o;
}

/** Suche im Register: Name, Firma, Telefon, E-Mail, Ort. */
export function sucheKontakte(register: Kontaktdatensatz[], begriff: string): Kontaktdatensatz[] {
  const b = klein(begriff);
  if (b.length < 2) return [];
  const tel = ziffern(begriff);
  return register.filter(
    (r) =>
      [r.name, r.firma, r.email, r.ort].some((f) => klein(f).includes(b)) ||
      (tel.length >= 3 && (ziffern(r.telefon).includes(tel) || ziffern(r.mobil).includes(tel))),
  );
}
