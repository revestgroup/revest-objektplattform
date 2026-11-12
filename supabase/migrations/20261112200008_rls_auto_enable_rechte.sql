-- Datenbankänderung: Ausführungsrecht für public.rls_auto_enable() einschränken.
-- Die Funktion legt Supabase für „Automatic RLS“ an; der Event-Trigger ensure_rls
-- ruft sie bei jedem CREATE TABLE auf und schaltet RLS ein. Ohne eingetragene Rechte
-- durfte jeder sie ausführen, auch ohne Anmeldung (/rest/v1/rpc/rls_auto_enable) —
-- das bemängelt der Supabase-Linter (0028/0029). Hier wird nur das EXECUTE-Recht für
-- public, anon und authenticated entzogen. Funktion und Event-Trigger bleiben
-- unverändert; Postgres prüft dieses Recht beim Auslösen des Event-Triggers nicht,
-- Automatic RLS arbeitet also weiter. Nichts wird gelöscht.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
