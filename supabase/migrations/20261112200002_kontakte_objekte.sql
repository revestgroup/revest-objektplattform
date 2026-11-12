-- Datenbankänderung: Kontakte, Objekte und alle Teile des Objekts.
-- Neue Tabellen: kontaktkategorien, kontakte, kontakt_notizen, objekte, einheiten,
-- objekt_geheim (nur GF), objekt_kontakte, angebote, sanierungsposten,
-- aktivitaeten, dokumente, zaehler, uebergaben, ummeldungen, nachberechnung,
-- weg_eigentuemer. Das Objekt ist die Klammer (objekt_id), nichts wird gelöscht.

-- ---------------------------------------------------------------------------
-- Kontakte
-- ---------------------------------------------------------------------------
create table public.kontaktkategorien (
  id text primary key default gen_random_uuid()::text,
  titel text not null unique,
  gruppe text not null check (gruppe in ('ankauf', 'kapital', 'abwicklung', 'sonstiges')),
  reihenfolge integer not null default 0
);
select intern.einrichten('public.kontaktkategorien', 'firma');

create table public.kontakte (
  id text primary key default gen_random_uuid()::text,
  name text not null default '',
  firma text,
  kategorien text[] not null default '{}',
  telefon text,
  mobil text,
  email text,
  ort text,
  anschrift text,
  status text not null default 'neu'
    check (status in ('neu', 'todo', 'kontaktiert', 'aktiv', 'inaktiv')),
  quelle text,
  letzter_kontakt timestamptz,
  kontakt_nicht_gewuenscht boolean not null default false
);
select intern.einrichten('public.kontakte', 'firma');
create index kontakte_email_idx on public.kontakte (lower(email));

create table public.kontakt_notizen (
  id text primary key default gen_random_uuid()::text,
  kontakt_id text not null references public.kontakte (id) on delete restrict,
  zeitpunkt timestamptz not null default now(),
  text text not null,
  verfasser text
);
select intern.einrichten('public.kontakt_notizen', 'firma');
create index kontakt_notizen_kontakt_idx on public.kontakt_notizen (kontakt_id);

-- ---------------------------------------------------------------------------
-- Objekte
-- ---------------------------------------------------------------------------
create table public.objekte (
  id text primary key default gen_random_uuid()::text,
  bezeichnung text,
  strasse text not null,
  plz text not null default '',
  stadt text not null default '',
  stadtteil text not null default '',
  bundesland text not null default '',
  laenge numeric not null,
  breite numeric not null,
  umriss jsonb,
  objektart text not null
    check (objektart in ('mfh', 'etw', 'efh', 'whg_geschaeftshaus', 'grundstueck')),
  zustand text not null default 'vermietet'
    check (zustand in ('vermietet', 'leerstand', 'sanierungsbedarf')),
  stufe text not null default 'neu'
    check (stufe in ('neu', 'unterlagen', 'qualifiziert', 'besichtigt', 'angebot', 'nachfassen',
                     'angekauft', 'watchlist', 'unqualifiziert', 'abgesagt')),
  kaufpreis numeric(12, 2),
  ankaufslimit numeric(12, 2),
  wohnflaeche numeric,
  gewerbeflaeche numeric,
  grundstuecksflaeche numeric,
  anzahl_einheiten integer,
  zimmer numeric,
  baujahr integer,
  letzte_sanierung integer,
  jahres_nettokaltmiete numeric(12, 2),
  potenzial_miete numeric(12, 2),
  nicht_umlagefaehig numeric(12, 2),
  instandhaltungsruecklage numeric(12, 2),
  maklerprovision numeric,
  hausgeld numeric(12, 2),
  energieklasse text,
  energiekennwert numeric,
  denkmalschutz boolean not null default false,
  erbbaurecht boolean not null default false,
  paket boolean not null default false,
  etage text,
  stellplatz text,
  quelle text,
  kurznotiz text,
  notiz text,
  vertriebsweg text check (vertriebsweg in ('etw', 'wg')),
  wg_zimmer integer,
  kuerzel text unique check (kuerzel ~ '^[A-Z0-9]+$'),
  gesellschaft text check (gesellschaft in ('revest_projekt', 'revest_asset', 'gt_projekt')),
  drive_ordner_url text,
  absagegrund text,
  angekauft_am date,
  besitzuebergang_am date,
  frist_bis timestamptz,
  bilder text[] not null default '{}',
  -- Rechenstände, die nur im Objekt gelesen werden
  infos jsonb,
  pruefung jsonb,
  kalkulation_etw jsonb,
  verkaufsplan jsonb,
  aufteilung jsonb,
  teilung jsonb,
  nachkalkulation jsonb,
  datenraum jsonb,
  abschluss jsonb,
  nachberechnung_stichtage jsonb,
  uebergabe_ankauf jsonb,
  uebergabe_vorlage jsonb,
  -- Der Schlüsselbox-Code gehört nie hierher, sondern nach objekt_geheim.
  constraint objekte_infos_ohne_code check (infos is null or not (infos ? 'schluesselboxCode'))
);
select intern.einrichten('public.objekte', 'firma');
create index objekte_stufe_idx on public.objekte (stufe);

create table public.einheiten (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  bezeichnung text not null default '',
  geschoss text not null default '',
  wohnflaeche numeric,
  zimmer numeric,
  kaltmiete numeric(12, 2),
  status text not null default 'geplant'
    check (status in ('geplant', 'in_sanierung', 'im_vertrieb', 'reserviert', 'verkauft', 'eigenbestand')),
  nutzung text check (nutzung in ('etw', 'wg', 'gewerbe')),
  wohnungs_nr text,
  stellplatz_nr text,
  abstellraum_nr text,
  kaeufer text,
  kaeufer_kontakt text,
  verkaufspreis numeric(12, 2),
  verkauft_am date,
  uebergabe_am date
);
select intern.einrichten('public.einheiten', 'firma');
create index einheiten_objekt_idx on public.einheiten (objekt_id);

-- Schlüsselbox-Codes getrennt, nur GF.
create table public.objekt_geheim (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  einheit_id text references public.einheiten (id) on delete restrict,
  schluesselbox_code text
);
select intern.einrichten('public.objekt_geheim', 'nur_gf');
create unique index objekt_geheim_eindeutig
  on public.objekt_geheim (objekt_id, coalesce(einheit_id, ''));

create table public.objekt_kontakte (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  kontakt_id text not null references public.kontakte (id) on delete restrict,
  rolle text not null
    check (rolle in ('eigentuemer', 'makler', 'verwalter', 'notar', 'handwerker', 'sonst')),
  notiz text,
  unique (objekt_id, kontakt_id, rolle)
);
select intern.einrichten('public.objekt_kontakte', 'firma');
create index objekt_kontakte_kontakt_idx on public.objekt_kontakte (kontakt_id);

create table public.angebote (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  datum date not null,
  art text not null check (art in ('forderung', 'gebot', 'notarpreis')),
  preis numeric(12, 2) not null,
  quelle text,
  ergebnis text not null default 'offen'
    check (ergebnis in ('offen', 'angenommen', 'abgelehnt', 'zu_teuer', 'zurueckgezogen')),
  notiz text
);
select intern.einrichten('public.angebote', 'firma');
create index angebote_objekt_idx on public.angebote (objekt_id);

create table public.sanierungsposten (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  gewerk text not null
    check (gewerk in ('abbruch', 'rohbau', 'dach', 'fassade', 'fenster', 'elektro', 'sanitaer',
                      'heizung', 'trockenbau', 'estrich', 'fliesen', 'boden', 'maler', 'tueren',
                      'aussenanlagen', 'baunebenkosten', 'unvorhergesehen')),
  geplant numeric(12, 2),
  tatsaechlich numeric(12, 2),
  firma text,
  status text not null default 'offen'
    check (status in ('offen', 'ausgeschrieben', 'beauftragt', 'laufend', 'abgenommen')),
  notiz text
);
select intern.einrichten('public.sanierungsposten', 'firma');
create index sanierungsposten_objekt_idx on public.sanierungsposten (objekt_id);

create table public.aktivitaeten (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  zeitpunkt timestamptz not null default now(),
  art text not null
    check (art in ('status', 'notiz', 'dokument', 'anlage', 'mail', 'telefonat', 'termin')),
  text text not null default '',
  stufe text,
  mail jsonb,
  telefonat jsonb,
  termin jsonb,
  quelle text check (quelle in ('hand', 'gmail', 'kalender', 'system')),
  extern_id text,
  von_hand boolean,
  verfasser text
);
select intern.einrichten('public.aktivitaeten', 'firma');
create index aktivitaeten_objekt_idx on public.aktivitaeten (objekt_id, zeitpunkt desc);
create unique index aktivitaeten_extern_eindeutig
  on public.aktivitaeten (quelle, extern_id) where extern_id is not null;

create table public.dokumente (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  name text not null,
  ordner text not null default '',
  groesse_kb integer,
  hochgeladen_am timestamptz not null default now(),
  speicherpfad text
);
select intern.einrichten('public.dokumente', 'firma');
create index dokumente_objekt_idx on public.dokumente (objekt_id);

create table public.zaehler (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  einheit_id text references public.einheiten (id) on delete restrict,
  richtung text not null check (richtung in ('an', 'ab')),
  art text not null check (art in ('strom', 'gas', 'wasser_kalt', 'wasser_warm', 'heizung', 'sonst')),
  nummer text,
  stand text,
  datum date,
  malo_id text,
  foto_name text
);
select intern.einrichten('public.zaehler', 'firma');
create index zaehler_objekt_idx on public.zaehler (objekt_id);

create table public.uebergaben (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  einheit_id text references public.einheiten (id) on delete restrict,
  richtung text not null check (richtung in ('an', 'ab')),
  pdf_name text,
  anwesende text[] not null default '{}',
  schluessel jsonb not null default '[]',
  maengel jsonb not null default '[]',
  bemerkungen text
);
select intern.einrichten('public.uebergaben', 'firma');
create index uebergaben_objekt_idx on public.uebergaben (objekt_id);

create table public.ummeldungen (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  einheit_id text references public.einheiten (id) on delete restrict,
  richtung text not null check (richtung in ('an', 'ab')),
  art text not null
    check (art in ('hausverwaltung', 'sepa_hausgeld', 'verwaltungsliste', 'gas', 'strom', 'wasser',
                   'versicherung', 'grundbuch_versicherung', 'versicherung_abrechnung',
                   'schornsteinfeger', 'grundbesitzabgaben', 'grundsteuer_anteilig')),
  status text not null default 'offen' check (status in ('offen', 'gemeldet', 'bestaetigt', 'entfaellt')),
  anbieter text,
  zaehlernummer text,
  zaehlerstand text,
  gemeldet_am date,
  bestaetigt_am date,
  notiz text
);
select intern.einrichten('public.ummeldungen', 'firma');
create index ummeldungen_objekt_idx on public.ummeldungen (objekt_id);

create table public.nachberechnung (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  einheit_id text references public.einheiten (id) on delete restrict,
  seite text not null check (seite in ('ankauf', 'verkauf')),
  art text not null
    check (art in ('grundsteuer', 'grundbesitzabgaben', 'hausgeld', 'hausgeldabrechnung',
                   'versicherung', 'versorger', 'schornsteinfeger', 'sonst')),
  titel text,
  betrag numeric(12, 2),
  von date,
  bis date,
  beleg_name text,
  status text not null default 'offen' check (status in ('offen', 'gemeldet', 'bezahlt', 'erledigt')),
  manuell_revest numeric(12, 2),
  platzhalter boolean not null default false,
  abgerechnet_am date,
  zahlungseingang date,
  extern_id text
);
select intern.einrichten('public.nachberechnung', 'firma');
create index nachberechnung_objekt_idx on public.nachberechnung (objekt_id);

create table public.weg_eigentuemer (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  name text not null,
  anschrift text,
  we_nr text,
  kontakt_nicht_gewuenscht boolean not null default false,
  quelle text,
  angabe_am date,
  kontakt_id text references public.kontakte (id) on delete restrict
);
select intern.einrichten('public.weg_eigentuemer', 'firma');
create index weg_eigentuemer_objekt_idx on public.weg_eigentuemer (objekt_id);
