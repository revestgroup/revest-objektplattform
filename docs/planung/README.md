# Planung Objektplattform

Reihenfolge der Umsetzung:

1. `FEINSCHLIFF_1.md`, Blöcke A–E (je ein Branch, je erst Plan zeigen)
   - A Ankauf (Pipeline, Objektfenster, Checkliste Ankauf, Kontakte-Kacheln)
   - B Kalkulation (nach `KALKULATION_ETW.md`)
   - C Projekte (Drive, Einheiten, Teilung, Ummeldungen)
   - D Kontaktregister
   - E Backoffice
2. `KARTE_DATENBANK.md` erst danach, wird vorher noch geschärft.

Layout-Vorlagen (freigegeben): `entwurf_kalkulation.dc.html`, `entwurf_checkliste.dc.html`, `entwurf_kontakte.dc.html`.
Das Markup und die Logik im `<script>` zeigen Aufbau und Verhalten; die Darstellung an das bestehende Design der App anpassen.

`BRIEFING_Claude_Code.md` ist das Gesamtbriefing (Kontext, Entscheidungen, Phase 2).

Vorläufige Entscheidungen, bis Timo anders entscheidet:
- Kontakte: „Kunde“ und „Kaufinteressent“ bleiben getrennte Kategorien.
- Firma ist ein Textfeld am Kontakt (mit Vorschlägen aus bestehenden Firmennamen), keine eigenen Firmen-Datensätze.
- Reiter „Vertrieb“ im Projekt bleibt vorerst unverändert.
