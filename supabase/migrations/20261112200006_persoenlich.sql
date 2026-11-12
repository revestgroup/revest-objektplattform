-- Datenbankänderung: Persönlicher Bereich.
-- Neue Tabellen (je mit besitzer_id, lesen und schreiben nur der Besitzer — auch die
-- GF sieht keine fremden Einträge): gedanken, tagesfokus, visionboard_kacheln,
-- private_ziele, ideen, persoenliche_einstellungen.
-- Neuer privater Speicher-Bucket `persoenlich` für Visionboard-Bilder, ein Ordner je
-- Nutzer (<besitzer_id>/…), Zugriff nur für den Besitzer, kein Löschen.

create table public.gedanken (
  id text primary key default gen_random_uuid()::text,
  besitzer_id uuid not null default auth.uid() references public.profile (id) on delete restrict,
  text text not null,
  ziel text check (ziel in ('aufgabe', 'backoffice', 'idee', 'verworfen')),
  sortiert_am timestamptz,
  verweis_id text,
  zustaendig text not null default 'gf' check (zustaendig in ('gf', 'backoffice')),
  quelle text not null default 'hand' check (quelle in ('hand', 'handy', 'mail')),
  extern_id text,
  ki_vorschlag text check (ki_vorschlag in ('aufgabe', 'backoffice', 'idee', 'verworfen'))
);
select intern.einrichten('public.gedanken', 'besitzer');
create index gedanken_besitzer_idx on public.gedanken (besitzer_id, erstellt_am desc);

create table public.tagesfokus (
  id text primary key default gen_random_uuid()::text,
  besitzer_id uuid not null default auth.uid() references public.profile (id) on delete restrict,
  datum date not null,
  text text not null default '',
  unique (besitzer_id, datum)
);
select intern.einrichten('public.tagesfokus', 'besitzer');

create table public.visionboard_kacheln (
  id text primary key default gen_random_uuid()::text,
  besitzer_id uuid not null default auth.uid() references public.profile (id) on delete restrict,
  kategorie text not null default '',
  satz text not null default '',
  bild_pfad text,
  reihenfolge integer not null default 0,
  -- Bilder liegen nur im eigenen Ordner des Buckets.
  constraint visionboard_bild_im_eigenen_ordner
    check (bild_pfad is null or bild_pfad like besitzer_id::text || '/%')
);
select intern.einrichten('public.visionboard_kacheln', 'besitzer');
create index visionboard_kacheln_besitzer_idx on public.visionboard_kacheln (besitzer_id, reihenfolge);

create table public.private_ziele (
  id text primary key default gen_random_uuid()::text,
  besitzer_id uuid not null default auth.uid() references public.profile (id) on delete restrict,
  jahr integer not null,
  name text not null,
  stand text not null default '',
  fortschritt integer not null default 0 check (fortschritt between 0 and 100),
  quartale boolean[] not null default array[false, false, false, false]
    check (cardinality(quartale) = 4)
);
select intern.einrichten('public.private_ziele', 'besitzer');
create index private_ziele_besitzer_idx on public.private_ziele (besitzer_id, jahr);

create table public.ideen (
  id text primary key default gen_random_uuid()::text,
  besitzer_id uuid not null default auth.uid() references public.profile (id) on delete restrict,
  text text not null
);
select intern.einrichten('public.ideen', 'besitzer');
create index ideen_besitzer_idx on public.ideen (besitzer_id, erstellt_am desc);

create table public.persoenliche_einstellungen (
  id text primary key default gen_random_uuid()::text,
  besitzer_id uuid not null unique default auth.uid() references public.profile (id) on delete restrict,
  warum text not null default '',
  impuls jsonb not null default '{}',
  geschaeft_quartale jsonb not null default '{}',
  tisch_vermerke jsonb not null default '{}'
);
select intern.einrichten('public.persoenliche_einstellungen', 'besitzer');

-- ---------------------------------------------------------------------------
-- Speicher-Bucket für Visionboard-Bilder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('persoenlich', 'persoenlich', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy persoenlich_lesen on storage.objects
  for select to authenticated
  using (
    bucket_id = 'persoenlich'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select intern.ist_revest())
  );

create policy persoenlich_anlegen on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'persoenlich'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select intern.ist_revest())
  );

create policy persoenlich_aendern on storage.objects
  for update to authenticated
  using (
    bucket_id = 'persoenlich'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select intern.ist_revest())
  )
  with check (
    bucket_id = 'persoenlich'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select intern.ist_revest())
  );
