-- Datenbankänderung: Ergänzungen zum Datenmodell (nur revest-test). Nichts wird
-- gelöscht oder umbenannt.
--  1. Neue Tabelle gebaeude; objekte.gebaeude_id und weg_eigentuemer.gebaeude_id
--     verweisen darauf; weg_eigentuemer.objekt_id wird optional (Objekt oder Gebäude).
--  2. Neue Tabelle stufenverlauf, gefüllt per Trigger bei jedem Stufenwechsel.
--  3. kontakte.angabe_am (quelle gibt es schon; weg_eigentuemer hat beides schon).
--  4. herkunft und extern_id an objekte, kontakte, posteingang_mails, dokumente,
--     eindeutig je Herkunft.
--  5. Privater Bucket firma (Zählerfotos, Übergabe-PDFs, Belege) für alle Revest-Nutzer.
--  6. routine_haken.besitzer_id; ein aktiver Haken je Punkt, Tag und Person. Dafür
--     wird der Index routine_haken_eindeutig (Punkt, Tag) durch einen Index mit Person
--     ersetzt — keine Daten, Tabellen oder Spalten betroffen.
--  7. geaendert_von an allen Tabellen (Trigger), nachberechnung.beleg_dokument_id,
--     dokumente.einheit_id, dokumente.checklistenpunkt, dokumente.drive_link.
--     backoffice_karten.gesellschaft besteht bereits.

-- ---------------------------------------------------------------------------
-- 7a. geaendert_von an allen bestehenden Tabellen, Trigger und einrichten() ergänzen
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'geaendert_am' and not a.attisdropped
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format(
      'alter table public.%I add column if not exists geaendert_von uuid references public.profile (id)',
      t.relname
    );
  end loop;
end;
$$;

create or replace function intern.geaendert_am_setzen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.geaendert_am := now();
  if (select auth.uid()) is not null then
    new.geaendert_von := (select auth.uid());
  end if;
  return new;
end;
$$;

create or replace function intern.einrichten(tabelle regclass, regel text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  t text := tabelle::text;
  n text := replace(split_part(tabelle::text, '.', 2), '"', '');
  lesen text;
  schreiben text;
begin
  if n = '' then
    n := replace(tabelle::text, '"', '');
  end if;

  execute format('alter table %s add column if not exists erstellt_von uuid default auth.uid() references public.profile (id)', t);
  execute format('alter table %s add column if not exists erstellt_am timestamptz not null default now()', t);
  execute format('alter table %s add column if not exists geaendert_am timestamptz not null default now()', t);
  execute format('alter table %s add column if not exists geaendert_von uuid references public.profile (id)', t);
  execute format('alter table %s add column if not exists archiviert_am timestamptz', t);
  execute format('create trigger %I before update on %s for each row execute function intern.geaendert_am_setzen()', n || '_geaendert_am', t);

  execute format('alter table %s enable row level security', t);
  execute format('revoke all on %s from anon, authenticated', t);
  execute format('grant select, insert, update on %s to authenticated', t);

  if regel = 'firma' then
    lesen := '(select intern.ist_revest())';
    schreiben := '(select intern.ist_revest())';
  elsif regel = 'firma_gf' then
    lesen := '(select intern.ist_revest())';
    schreiben := '(select intern.ist_gf())';
  elsif regel = 'nur_gf' then
    lesen := '(select intern.ist_gf())';
    schreiben := '(select intern.ist_gf())';
  elsif regel = 'besitzer' then
    lesen := '(select intern.ist_revest()) and besitzer_id = (select auth.uid())';
    schreiben := lesen;
  elsif regel = 'eigene' then
    return;
  else
    raise exception 'Unbekannte Regel %', regel;
  end if;

  execute format('create policy %I on %s for select to authenticated using (%s)', n || '_lesen', t, lesen);
  execute format('create policy %I on %s for insert to authenticated with check (%s)', n || '_anlegen', t, schreiben);
  execute format('create policy %I on %s for update to authenticated using (%s) with check (%s)', n || '_aendern', t, schreiben, schreiben);
end;
$$;

revoke all on function intern.einrichten(regclass, text) from public, anon, authenticated;
revoke all on function intern.geaendert_am_setzen() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Gebäude
-- ---------------------------------------------------------------------------
create table public.gebaeude (
  id text primary key default gen_random_uuid()::text,
  strasse text not null,
  plz text not null default '',
  stadt text not null default '',
  stadtteil text not null default '',
  laenge numeric not null,
  breite numeric not null,
  umriss jsonb,
  ist_weg boolean not null default false,
  infostufe text not null default 'erfasst'
    check (infostufe in ('erfasst', 'eigentuemer_bekannt', 'im_gespraech', 'deal', 'gekauft', 'ausgeschlossen')),
  notiz text
);
select intern.einrichten('public.gebaeude', 'firma');
create index gebaeude_lage_idx on public.gebaeude (stadt, strasse);

alter table public.objekte
  add column gebaeude_id text references public.gebaeude (id) on delete restrict;
create index objekte_gebaeude_idx on public.objekte (gebaeude_id);

alter table public.weg_eigentuemer
  add column gebaeude_id text references public.gebaeude (id) on delete restrict;
alter table public.weg_eigentuemer
  alter column objekt_id drop not null;
alter table public.weg_eigentuemer
  add constraint weg_eigentuemer_objekt_oder_gebaeude
  check (objekt_id is not null or gebaeude_id is not null);
create index weg_eigentuemer_gebaeude_idx on public.weg_eigentuemer (gebaeude_id);

-- ---------------------------------------------------------------------------
-- 2. Stufenverlauf
-- ---------------------------------------------------------------------------
create table public.stufenverlauf (
  id text primary key default gen_random_uuid()::text,
  objekt_id text not null references public.objekte (id) on delete restrict,
  von_stufe text
    check (von_stufe in ('neu', 'unterlagen', 'qualifiziert', 'besichtigt', 'angebot', 'nachfassen',
                         'angekauft', 'watchlist', 'unqualifiziert', 'abgesagt')),
  nach_stufe text not null
    check (nach_stufe in ('neu', 'unterlagen', 'qualifiziert', 'besichtigt', 'angebot', 'nachfassen',
                          'angekauft', 'watchlist', 'unqualifiziert', 'abgesagt')),
  zeitpunkt timestamptz not null default now(),
  durch uuid default auth.uid() references public.profile (id) on delete restrict
);
select intern.einrichten('public.stufenverlauf', 'firma');
create index stufenverlauf_objekt_idx on public.stufenverlauf (objekt_id, zeitpunkt);
create index stufenverlauf_auswertung_idx on public.stufenverlauf (nach_stufe, zeitpunkt);

-- Der Verlauf ist Grundlage der Auswertung: nachträglich ändern nur die GF.
create policy stufenverlauf_aendern_nur_gf on public.stufenverlauf
  as restrictive for update to authenticated
  using ((select intern.ist_gf()))
  with check ((select intern.ist_gf()));

-- Jeder Stufenwechsel am Objekt (und das Anlegen) wird automatisch festgehalten.
create or replace function intern.stufenwechsel_merken()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.stufe is distinct from old.stufe then
    insert into public.stufenverlauf (objekt_id, von_stufe, nach_stufe)
    values (new.id, case when tg_op = 'UPDATE' then old.stufe end, new.stufe);
  end if;
  return new;
end;
$$;
revoke all on function intern.stufenwechsel_merken() from public, anon, authenticated;

create trigger objekte_stufenwechsel
  after insert or update of stufe on public.objekte
  for each row execute function intern.stufenwechsel_merken();

-- ---------------------------------------------------------------------------
-- 3. Kontakte: Datum der Angabe
-- ---------------------------------------------------------------------------
alter table public.kontakte add column angabe_am date;

-- ---------------------------------------------------------------------------
-- 4. Herkunft und externe ID (eindeutig je Herkunft)
-- ---------------------------------------------------------------------------
alter table public.objekte add column herkunft text not null default 'hand';
alter table public.objekte add column extern_id text;
create unique index objekte_herkunft_extern_eindeutig
  on public.objekte (herkunft, extern_id) where extern_id is not null;

alter table public.kontakte add column herkunft text not null default 'hand';
alter table public.kontakte add column extern_id text;
create unique index kontakte_herkunft_extern_eindeutig
  on public.kontakte (herkunft, extern_id) where extern_id is not null;

alter table public.posteingang_mails add column herkunft text not null default 'hand';
create unique index posteingang_mails_herkunft_extern_eindeutig
  on public.posteingang_mails (herkunft, extern_id) where extern_id is not null;

alter table public.dokumente add column herkunft text not null default 'hand';
alter table public.dokumente add column extern_id text;
create unique index dokumente_herkunft_extern_eindeutig
  on public.dokumente (herkunft, extern_id) where extern_id is not null;

-- ---------------------------------------------------------------------------
-- 7b. Dokumente und Nachberechnung
-- ---------------------------------------------------------------------------
alter table public.dokumente
  add column einheit_id text references public.einheiten (id) on delete restrict;
alter table public.dokumente add column checklistenpunkt text;
alter table public.dokumente add column drive_link text;
create index dokumente_einheit_idx on public.dokumente (einheit_id);

alter table public.nachberechnung
  add column beleg_dokument_id text references public.dokumente (id) on delete restrict;
create index nachberechnung_beleg_idx on public.nachberechnung (beleg_dokument_id);

-- ---------------------------------------------------------------------------
-- 6. Routine-Haken je Person
-- ---------------------------------------------------------------------------
alter table public.routine_haken
  add column besitzer_id uuid not null default auth.uid() references public.profile (id) on delete restrict;

drop index public.routine_haken_eindeutig;
create unique index routine_haken_je_person
  on public.routine_haken (punkt_id, datum, besitzer_id) where archiviert_am is null;

-- Lesen alle (Zeitauswertung), anlegen und ändern nur eigene Haken.
create policy routine_haken_nur_eigene_anlegen on public.routine_haken
  as restrictive for insert to authenticated
  with check (besitzer_id = (select auth.uid()));
create policy routine_haken_nur_eigene_aendern on public.routine_haken
  as restrictive for update to authenticated
  using (besitzer_id = (select auth.uid()))
  with check (besitzer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Bucket firma: Zählerfotos, Übergabe-PDFs, Belege
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'firma', 'firma', false, 26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

create policy firma_lesen on storage.objects
  for select to authenticated
  using (bucket_id = 'firma' and (select intern.ist_revest()));

create policy firma_anlegen on storage.objects
  for insert to authenticated
  with check (bucket_id = 'firma' and (select intern.ist_revest()));

create policy firma_aendern on storage.objects
  for update to authenticated
  using (bucket_id = 'firma' and (select intern.ist_revest()))
  with check (bucket_id = 'firma' and (select intern.ist_revest()));
