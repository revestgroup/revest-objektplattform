-- Datenbankänderung: Grundlagen für Phase 2 · S2.
-- Schema `intern` (nicht über die Data API erreichbar), Trigger für geaendert_am,
-- Tabelle `profile`, Prüffunktionen ist_revest() / ist_gf() und die Hilfsfunktion
-- intern.einrichten(), die jede Tabelle einheitlich mit Standardspalten, RLS,
-- Rechten und Regeln versieht. Nichts wird gelöscht: es gibt keine delete-Rechte.

create schema if not exists intern;
revoke all on schema intern from public;
grant usage on schema intern to authenticated;

-- ---------------------------------------------------------------------------
-- geaendert_am bei jeder Änderung
-- ---------------------------------------------------------------------------
create or replace function intern.geaendert_am_setzen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.geaendert_am := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profile: ein Eintrag je angemeldetem Nutzer (angelegt ab S3 per Trigger)
-- ---------------------------------------------------------------------------
create table public.profile (
  id uuid primary key references auth.users (id) on delete restrict,
  email text not null unique,
  name text,
  rolle text not null default 'backoffice' check (rolle in ('gf', 'backoffice')),
  aktiv boolean not null default true,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  archiviert_am timestamptz
);

create trigger profile_geaendert_am
  before update on public.profile
  for each row execute function intern.geaendert_am_setzen();

-- ---------------------------------------------------------------------------
-- Prüffunktionen für die Regeln (lesen nur profile, fester search_path)
-- ---------------------------------------------------------------------------
create or replace function intern.ist_revest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profile p
    where p.id = (select auth.uid()) and p.aktiv and p.archiviert_am is null
  );
$$;

create or replace function intern.ist_gf()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profile p
    where p.id = (select auth.uid()) and p.aktiv and p.archiviert_am is null
      and p.rolle = 'gf'
  );
$$;

revoke all on function intern.ist_revest() from public, anon;
revoke all on function intern.ist_gf() from public, anon;
grant execute on function intern.ist_revest() to authenticated;
grant execute on function intern.ist_gf() to authenticated;

alter table public.profile enable row level security;
revoke all on public.profile from anon, authenticated;
grant select, update (name, rolle, aktiv, archiviert_am) on public.profile to authenticated;

create policy profile_lesen on public.profile
  for select to authenticated
  using (id = (select auth.uid()) or (select intern.ist_revest()));

create policy profile_aendern_gf on public.profile
  for update to authenticated
  using ((select intern.ist_gf()))
  with check ((select intern.ist_gf()));

-- ---------------------------------------------------------------------------
-- intern.einrichten(tabelle, regel)
--   firma           lesen und schreiben: alle Revest-Nutzer
--   firma_gf        lesen: alle Revest-Nutzer, schreiben: nur GF
--   nur_gf          lesen und schreiben: nur GF
--   besitzer        lesen und schreiben: nur der Besitzer (besitzer_id)
--   eigene          nur Grundausstattung, die Regeln legt die Migration selbst an
-- Ergänzt die Standardspalten erstellt_von, erstellt_am, geaendert_am,
-- archiviert_am, den Trigger, RLS und die Rechte select/insert/update.
-- Nie delete. Nur für Migrationen gedacht, für niemanden ausführbar.
-- ---------------------------------------------------------------------------
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
    -- Regeln legt die Migration selbst an (z. B. sprintpunkte).
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
