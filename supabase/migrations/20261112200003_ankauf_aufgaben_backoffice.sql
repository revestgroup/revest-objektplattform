-- Datenbankänderung: Ankauf-Eingang, Aufgaben, Backoffice-Karten.
-- Neue Tabellen: angebotseingang, aufgaben, backoffice_karten. Alle Firmendaten
-- (lesen und schreiben alle Revest-Nutzer), zustaendig an Aufgaben und Karten.

create table public.angebotseingang (
  id text primary key default gen_random_uuid()::text,
  strasse text not null,
  plz text not null default '',
  stadt text not null default '',
  stadtteil text,
  preis numeric(12, 2),
  flaeche numeric,
  zimmer numeric,
  objektart text check (objektart in ('mfh', 'etw', 'efh', 'whg_geschaeftshaus', 'grundstueck')),
  absender text,
  absender_email text,
  kontakt_id text references public.kontakte (id) on delete restrict,
  eingang_am timestamptz not null default now(),
  quelle text not null default 'sonst'
    check (quelle in ('makler', 'immometrica', 'portal', 'direkt', 'sonst')),
  expose_name text,
  mailtext text,
  status text not null default 'offen' check (status in ('offen', 'interessant', 'aussortiert')),
  grund text,
  objekt_id text references public.objekte (id) on delete restrict,
  gesichtet_am timestamptz
);
select intern.einrichten('public.angebotseingang', 'firma');
create index angebotseingang_status_idx on public.angebotseingang (status, eingang_am desc);

create table public.aufgaben (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  beschreibung text,
  objekt_id text references public.objekte (id) on delete restrict,
  art text not null default 'sonst'
    check (art in ('anruf', 'unterlagen', 'besichtigung', 'rechnen', 'termin', 'sonst')),
  dringlichkeit text not null default 'normal' check (dringlichkeit in ('hoch', 'normal', 'niedrig')),
  faellig_am date,
  zeitblock_von time,
  zeitblock_bis time,
  bereich text,
  zustaendig text not null default 'gf' check (zustaendig in ('gf', 'backoffice')),
  erledigt_am timestamptz,
  constraint aufgaben_zeitblock check (
    (zeitblock_von is null and zeitblock_bis is null)
    or (zeitblock_von is not null and zeitblock_bis is not null and zeitblock_bis > zeitblock_von)
  )
);
select intern.einrichten('public.aufgaben', 'firma');
create index aufgaben_objekt_idx on public.aufgaben (objekt_id);
create index aufgaben_offen_idx on public.aufgaben (faellig_am) where erledigt_am is null;

create table public.backoffice_karten (
  id text primary key default gen_random_uuid()::text,
  titel text not null,
  spalte text not null default 'posteingang'
    check (spalte in ('posteingang', 'besprechung', 'in_arbeit', 'erledigt')),
  art text not null default 'sonstiges'
    check (art in ('rechnung', 'brief', 'vertrag', 'behoerde', 'todo', 'sonstiges')),
  quelle text not null default 'hand' check (quelle in ('scan', 'upload', 'mail', 'hand')),
  eingang_am timestamptz not null default now(),
  datei_name text,
  datei_typ text,
  objekt_id text references public.objekte (id) on delete restrict,
  gesellschaft text,
  faellig_am date,
  notizen text,
  checkliste jsonb not null default '[]',
  verlauf jsonb not null default '[]',
  zustaendig text not null default 'backoffice' check (zustaendig in ('gf', 'backoffice')),
  zugewiesen_an uuid references public.profile (id) on delete restrict,
  -- Übergabe: wartet → übertragen → bestätigt | fehlgeschlagen (eigene Spalten,
  -- damit „hängt seit 2 Tagen“ direkt abfragbar ist). archiviert_am = im Archiv.
  uebergabe_ziel text check (uebergabe_ziel in ('qonto', 'projekt', 'ablage')),
  uebergabe_status text
    check (uebergabe_status in ('wartet', 'uebertragen', 'bestaetigt', 'fehlgeschlagen')),
  uebergabe_am timestamptz,
  uebergabe_geaendert_am timestamptz,
  uebergabe_details text,
  uebergabe_link text,
  uebergabe_grund text,
  uebergabe_extern_id text,
  constraint backoffice_karten_uebergabe check ((uebergabe_ziel is null) = (uebergabe_status is null))
);
select intern.einrichten('public.backoffice_karten', 'firma');
create index backoffice_karten_objekt_idx on public.backoffice_karten (objekt_id);
create index backoffice_karten_offen_idx
  on public.backoffice_karten (uebergabe_status, uebergabe_geaendert_am)
  where archiviert_am is null;
