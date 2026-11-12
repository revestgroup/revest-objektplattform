-- Datenbankänderung: Firmenweite Einstellungen.
-- Neue Tabelle einstellungen (ein Eintrag je Schlüssel: ziele, kalkulationsvorgaben,
-- bankverbindung, suchprofil, kalender_id, sprint_bereiche, schalter).
-- Lesen alle Revest-Nutzer, ändern nur die GF.

create table public.einstellungen (
  id text primary key default gen_random_uuid()::text,
  schluessel text not null unique,
  wert jsonb not null default '{}'
);
select intern.einrichten('public.einstellungen', 'firma_gf');
