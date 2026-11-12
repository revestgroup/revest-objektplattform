-- Datenbankänderung: Cockpit (Firmendaten).
-- Neue Tabellen: fragen (antworten nur GF, per Trigger gesichert), sprintpunkte
-- (mit besitzer_id und privat: private Einträge sieht nur der Besitzer, ändern nur
-- der Besitzer), posteingang_mails, routinepunkte, routine_haken.

-- ---------------------------------------------------------------------------
-- Fragen an Timo
-- ---------------------------------------------------------------------------
create table public.fragen (
  id text primary key default gen_random_uuid()::text,
  text text not null,
  von text not null default 'backoffice' check (von in ('gf', 'backoffice')),
  bezug_art text check (bezug_art in ('karte', 'mail', 'frei')),
  bezug_id text,
  bezug_titel text,
  objekt_id text references public.objekte (id) on delete restrict,
  antworten text[] not null default array['Ja', 'Nein'] check (cardinality(antworten) = 2),
  antwort text,
  beantwortet_am timestamptz,
  beantwortet_von uuid references public.profile (id) on delete restrict
);
select intern.einrichten('public.fragen', 'firma');
create index fragen_offen_idx on public.fragen (erstellt_am desc) where antwort is null;

-- Antworten darf nur die Geschäftsführung; Zeitpunkt und Antwortende setzt der Trigger.
-- Gilt für angemeldete Nutzer; Importe mit Dienstschlüssel (ohne auth.uid) sind frei.
create or replace function intern.frage_antwort_pruefen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.antwort is not null and not intern.ist_gf() then
      raise exception 'Antworten darf nur die Geschäftsführung.';
    end if;
  elsif new.antwort is distinct from old.antwort
     or new.beantwortet_am is distinct from old.beantwortet_am
     or new.beantwortet_von is distinct from old.beantwortet_von then
    if not intern.ist_gf() then
      raise exception 'Antworten darf nur die Geschäftsführung.';
    end if;
  end if;
  if tg_op = 'INSERT' or new.antwort is distinct from old.antwort then
    new.beantwortet_am := case when new.antwort is null then null else now() end;
    new.beantwortet_von := case when new.antwort is null then null else (select auth.uid()) end;
  end if;
  return new;
end;
$$;
revoke all on function intern.frage_antwort_pruefen() from public, anon, authenticated;

create trigger fragen_antwort_pruefen
  before insert or update on public.fragen
  for each row execute function intern.frage_antwort_pruefen();

-- ---------------------------------------------------------------------------
-- Sprint-Punkte: Firmendaten mit Besitzer und „privat“
-- ---------------------------------------------------------------------------
create table public.sprintpunkte (
  id text primary key default gen_random_uuid()::text,
  besitzer_id uuid not null default auth.uid() references public.profile (id) on delete restrict,
  privat boolean not null default false,
  bereich text not null,
  titel text not null,
  von timestamptz not null,
  bis timestamptz not null,
  constraint sprintpunkte_zeitraum check (bis > von)
);
select intern.einrichten('public.sprintpunkte', 'eigene');
create index sprintpunkte_zeit_idx on public.sprintpunkte (von, bis);
create index sprintpunkte_besitzer_idx on public.sprintpunkte (besitzer_id);

create policy sprintpunkte_lesen on public.sprintpunkte
  for select to authenticated
  using ((select intern.ist_revest()) and (not privat or besitzer_id = (select auth.uid())));

create policy sprintpunkte_anlegen on public.sprintpunkte
  for insert to authenticated
  with check ((select intern.ist_revest()) and besitzer_id = (select auth.uid()));

create policy sprintpunkte_aendern on public.sprintpunkte
  for update to authenticated
  using ((select intern.ist_revest()) and besitzer_id = (select auth.uid()))
  with check ((select intern.ist_revest()) and besitzer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Posteingang vorsortiert
-- ---------------------------------------------------------------------------
create table public.posteingang_mails (
  id text primary key default gen_random_uuid()::text,
  postfach text not null check (postfach in ('ankauf@', 'info@', 'timo.birk@')),
  absender text not null default '',
  absender_email text,
  betreff text not null default '',
  text text not null default '',
  eingang_am timestamptz not null default now(),
  kategorie text,
  objekt_id text references public.objekte (id) on delete restrict,
  aktion text not null default 'karte'
    check (aktion in ('eingang', 'qonto', 'karte', 'aufgabe', 'antwort', 'ablage')),
  zustaendig text not null default 'backoffice' check (zustaendig in ('gf', 'backoffice')),
  frist date,
  status text not null default 'offen' check (status in ('offen', 'uebernommen')),
  erledigt_am timestamptz,
  verweis text,
  quelle text not null default 'hand' check (quelle in ('hand', 'gmail')),
  extern_id text
);
select intern.einrichten('public.posteingang_mails', 'firma');
create index posteingang_mails_status_idx on public.posteingang_mails (status, eingang_am desc);
create unique index posteingang_mails_extern_eindeutig
  on public.posteingang_mails (quelle, extern_id) where extern_id is not null;

-- ---------------------------------------------------------------------------
-- Backoffice-Routine und Zeiterfassung
-- ---------------------------------------------------------------------------
create table public.routinepunkte (
  id text primary key default gen_random_uuid()::text,
  art text not null check (art in ('tag', 'woche')),
  titel text not null,
  hinweis text not null default '',
  minuten integer not null default 0 check (minuten >= 0),
  kategorie text not null,
  wochentag integer check (wochentag between 1 and 5),
  reihenfolge integer not null default 0,
  constraint routinepunkte_wochentag check ((art = 'woche') = (wochentag is not null))
);
select intern.einrichten('public.routinepunkte', 'firma');

create table public.routine_haken (
  id text primary key default gen_random_uuid()::text,
  punkt_id text not null references public.routinepunkte (id) on delete restrict,
  datum date not null,
  minuten integer not null check (minuten >= 0),
  kategorie text not null
);
select intern.einrichten('public.routine_haken', 'firma');
-- Haken zurücknehmen = archiviert_am setzen; je Punkt und Tag nur ein aktiver Haken.
create unique index routine_haken_eindeutig
  on public.routine_haken (punkt_id, datum) where archiviert_am is null;
create index routine_haken_datum_idx on public.routine_haken (datum);
