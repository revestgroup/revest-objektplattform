-- Datenbankänderung: Vermietung.
-- Neue Tabellen: mietgarantien, garantie_zimmer, mieter (Firmendaten) und
-- mieter_vertraulich (Geburtsdatum, Arbeitgeber, Einkommen, Ausweis- und
-- Bonitätsunterlagen, Bürge) — nur GF, geregelt wie objekt_geheim.

create table public.mietgarantien (
  id text primary key default gen_random_uuid()::text,
  objekt_id text references public.objekte (id) on delete restrict,
  einheit_id text references public.einheiten (id) on delete restrict,
  adresse text not null default '',
  einheit_titel text not null default '',
  art text not null check (art in ('wohnung', 'wg')),
  kaeufer text not null default '',
  kaeufer_kontakt text,
  verkauft_am date,
  verkaufspreis numeric(12, 2),
  beginn date not null,
  laufzeit_monate integer not null,
  garantiemiete numeric(12, 2) not null,
  sollmiete numeric(12, 2),
  notiz text
);
select intern.einrichten('public.mietgarantien', 'firma');
create index mietgarantien_objekt_idx on public.mietgarantien (objekt_id);

create table public.garantie_zimmer (
  id text primary key default gen_random_uuid()::text,
  garantie_id text not null references public.mietgarantien (id) on delete restrict,
  bezeichnung text not null default '',
  flaeche numeric,
  miete numeric(12, 2) not null default 0
);
select intern.einrichten('public.garantie_zimmer', 'firma');
create index garantie_zimmer_garantie_idx on public.garantie_zimmer (garantie_id);

create table public.mieter (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text,
  telefon text,
  beruf text,
  status text not null default 'interessent'
    check (status in ('interessent', 'unterlagen', 'geprueft', 'zugeordnet', 'vertrag_raus',
                      'eingezogen', 'ausgezogen', 'abgelehnt')),
  quelle text not null default 'manuell'
    check (quelle in ('leadseite', 'empfehlung', 'portal', 'wg_gesucht', 'manuell')),
  garantie_id text references public.mietgarantien (id) on delete restrict,
  zimmer_id text references public.garantie_zimmer (id) on delete restrict,
  miete numeric(12, 2),
  einzug_am date,
  auszug_am date,
  vertrag jsonb,
  notiz text
);
select intern.einrichten('public.mieter', 'firma');
create index mieter_garantie_idx on public.mieter (garantie_id);

create table public.mieter_vertraulich (
  id text primary key default gen_random_uuid()::text,
  mieter_id text not null unique references public.mieter (id) on delete restrict,
  geburtsdatum date,
  arbeitgeber text,
  nettoeinkommen numeric(12, 2),
  unterlagen jsonb not null default '[]',
  buerge jsonb
);
select intern.einrichten('public.mieter_vertraulich', 'nur_gf');
