# Briefing für Claude Code: Revest Objektplattform

Stand: 08.11.2026 · Repo: `revestgroup/revest-objektplattform`

## Kontext

Interne Plattform der **Revest Projekt GmbH** (IMPERA-Gruppe) für Ankauf, Objektprüfung und Projektsteuerung.
Ersetzt monday CRM und Trello. **Qonto** (Belege, Banking) und **Google Drive** (Dokumente) bleiben bestehen und
werden angebunden. Brevo/Marketing bleibt außen vor. Nutzer: nur Revest-intern (Timo, später Halbtagskraft).

Die vollständige Planung liegt in `docs/planung/` (Reihenfolge in `docs/planung/README.md`,
aktuelle Runde `FEINSCHLIFF_1.md`). Diese Datei führt den Fortschritt.

Lies zuerst `AGENTS.md` und halte dich an die Design-Regeln (deutsche Benennung, Ampel-Status, Radien usw.).

## Arbeitsweise

- **Eine Aufgabe pro Durchgang.** Erst Plan zeigen, dann umsetzen, im Browser prüfen, committen.
- Bestehende Logik nicht umbauen, nur erweitern. Mock-Daten passend mitpflegen.
- Bestandsdaten im localStorage müssen gültig bleiben: neue Felder optional (`?:`) anlegen.

## Festgelegte Entscheidungen

1. **Ordnerstruktur = die bestehende Google-Drive-Struktur.** Die Plattform passt sich an.
2. **Objektkürzel** (z. B. `RAV134`) ist der Schlüssel für Drive-Dateinamen und Qonto-Labels.
3. **Gesellschaft** wird am Objekt geführt (Revest Projekt, später Revest Asset, GT Projekt).
4. Datei-Konvention: `JJJJ-MM-TT_Kürzel_Dokumentart_Beschreibung`.
   Objektordner: `JJJJ-MM_Ort_Straße Nr`.

## Fortschritt

| Aufgabe | Stand | Branch |
|---|---|---|
| 0. Sicherheit | erledigt (Repo auf privat stellen macht Timo) | `sicherheit/zugang-und-mockdaten` |
| 1. Ordnerstruktur | erledigt | `aufgabe-1/ordnerstruktur` |
| 2. Neue Felder am Objekt | erledigt | `aufgabe-2/objektfelder` |
| 2b. Ankauf-Pipeline | erledigt | `aufgabe-2b/pipeline` |
| 2c-1. Übersicht in drei Spalten, Kopf, Objekt in der Adresse | erledigt | `aufgabe-2c1/uebersicht` |
| 2c-2. Reiter „Dateien“ im Ankauf, Einsortieren beim Kauf | erledigt | `aufgabe-2c2/dateien` |
| 2c-3. Kalkulation ETW nach `KALKULATION_ETW.md` | erledigt (Abzug = Stellplatz/Garage, geklärt in Feinschliff B) | `aufgabe-2c3/kalkulation` |
| 3. Objektprüfung | erledigt | `aufgabe-3/pruefung` |
| 4. Ummeldungen | erledigt | `aufgabe-4/ummeldungen` |
| 4b. Ankauf-Eingang | offen, nach Feinschliff 1 | |
| Feinschliff 1 · A Ankauf | erledigt | `feinschliff/a-ankauf` |
| Feinschliff 1 · B Kalkulation | erledigt | `feinschliff/b-kalkulation` |
| Feinschliff 1 · C Projekte | erledigt | `feinschliff/c-projekte` |
| Feinschliff 1 · D Kontaktregister | erledigt (CSV-Import aus monday: Phase 2) | `feinschliff/d-kontakte` |
| Feinschliff 1 · E Backoffice | erledigt (echte Übergabe an Qonto/Drive, Mail-/Scan-Eingang: Phase 2) | `feinschliff/e-backoffice` |

Aufgaben 0–4 sind seit 08.11.2026 in `main`. Feinschliff-Blöcke je eigener Branch ab `main`, nach Test gemergt.

Hinweis für Aufgabe 3: Die Stufe „Verhandlung“ gibt es seit 2b nicht mehr. Die Warnung gilt
beim Wechsel nach „Angebot abgegeben“ bzw. „Gekauft“. Intern heißen „Gekauft“ und „No Deal“
weiter `angekauft` und `abgesagt`.

## Aufgaben in Reihenfolge

### 0. Sicherheit (vor allem anderen)
- Repo ist öffentlich. Timo stellt es auf privat.
- Klartext-Passwort aus `src/lib/auth.tsx` entfernen (z. B. über Umgebungsvariable, bis Supabase Auth kommt).
- Echte Adressen und Namen in `src/lib/mockDaten.ts` und `mockMieter.ts` durch erfundene ersetzen.

### 1. Ordnerstruktur vereinheitlichen
`DOKUMENT_ORDNER` und `ORDNER_BEISPIELE` in `src/lib/objekte.ts` auf die Drive-Struktur umstellen:

```
01_Unterlagen
   01_Unterlagen zum Objekt
   02_Bewirtschaftung
      00_Hausverwaltung · 01_Gas · 02_Strom · 03_Wasser_Stadtwerke
      04_Versicherung · 05_Schornsteinfeger · 06_Grundbesitzabgaben_Stadt
   03_Notar_Grundbuchsachen
   04_Finanzierung_Bank
02_Kalkulation
03_Renovierung
04_Bilder
   01_Ankauf - vor Renovierung · 02_Renovierungsphase · 03_nach Staging
05_Verkauf
   00_Vertrieb · 01_Notar
```
Unterordner müssen unterstützt werden. Vorhandene Mock-Dokumente auf die neuen Ordner abbilden.

### 2. Neue Felder am Objekt
- `kuerzel` (Pflicht ab Stufe „Angekauft“, eindeutig, Vorschlag aus Straße + Hausnummer)
- `gesellschaft`
- `driveOrdnerUrl` (Link zum Objektordner)
- `besitzuebergangAm` (getrennt von `angekauftAm` = Beurkundung)

### 2b. Ankauf-Pipeline nach Timos Ablauf (Hauptseite)
Die Pipeline-Ansicht ist **die Startansicht unter „Ankauf“**. Ziel: ein sehr simpler Ablauf.

**Stufen von links nach rechts** (ersetzen `STUFEN` / `STUFEN_REIHENFOLGE` in `src/lib/objekte.ts`):

| Stufe | Bereich | Farbe |
|---|---|---|
| Neu | aktiv | Gelb, hell |
| Unterlagen angefordert | aktiv | Gelb |
| Qualifiziert | aktiv | Gelb |
| Terminiert/Besichtigt | aktiv | Gelb, dunkler |
| Angebot abgegeben | aktiv | Gelb, dunkler |
| Nachfassen | aktiv | Gelb, am dunkelsten |
| Gekauft | Abschluss | Grün |
| Watchlist | Ablage | Blau/Grau (preislich zu hoch, beobachten) |
| Unqualifiziert | Ablage | Grau |
| No Deal | Ablage | Rot |

Die drei Ablage-Spalten stehen ganz rechts, schmaler bzw. eingeklappt, damit die aktive Pipeline im Fokus bleibt.
Bestehende Objekte auf die neuen Stufen abbilden (beobachtung → Watchlist, kontakt → Neu, pruefung → Qualifiziert,
verhandlung → Angebot abgegeben, angekauft → Gekauft, abgesagt → No Deal). Speicher-Version erhöhen oder migrieren.
Alle Stellen anpassen, die `STUFEN` nutzen (Karte, Legende, Auswertung, Filter, Deal-Dialog).

**Karte in der Pipeline zeigt nur:**
1. Bild (erstes Objektbild, sonst Platzhalter)
2. Bezeichnung/Titel (neues Feld `bezeichnung`, z. B. „WHG – 2Z – Eselsberg“; Fallback: Straße)
3. Adresse
4. m² (Wohnfläche)
5. Angebotspreis
6. Ansprechpartner: Name und Rolle (Makler, Eigentümer …), Telefon antippbar

Drag & Drop und die Stufenknöpfe in `ObjektPipeline.tsx` bleiben erhalten.
Bei monday-Übernahme gilt die Zuordnung jetzt 1:1 (monday nutzt dieselben Stufen).

### 2c. Objektkarte im Ankauf: maximaler Fokus
Das Objekt öffnet sich als **eigene, breite Seite** statt als schmale Schublade (480 px reichen nicht).

**Reiter „Übersicht“ in drei Spalten** (am Handy untereinander, in dieser Reihenfolge):
1. **Links: Kontakt & Mail.** Ansprechpartner (Makler, Eigentümer …) mit Telefon und E-Mail antippbar,
   Knopf „E-Mail schreiben“ (öffnet Gmail mit Empfänger und Betreff `[Kürzel] Bezeichnung`).
2. **Mitte: Notizen.** Oben eine feste Kurznotiz (das Wesentliche, z. B. „18k für TG locker, eigenes Grundbuch TG?“),
   darunter der Notizverlauf mit Datum (und später Verfasser), neue Notiz direkt eintippbar.
3. **Rechts: Objekt-Steckbrief + Kalkulations-Eckdaten.**
   - Steckbrief: Objektart, Baujahr, Wohnfläche, Zimmer, Etage, Zustand/Mietverhältnis, Hausgeld,
     Erhaltungsrücklage, Stellplatz/TG, Energieklasse, Quelle.
   - Kalkulations-Eckdaten: Kaufpreis, Gesamtinvestition, Gewinn und Gewinn-% für Worst/Mid/Best,
     Knopf „Zur Kalkulation“.

Im Kopf darüber: Bild, Bezeichnung, Adresse, m², Angebotspreis, Stufe.

**Die bestehenden Reiter (Unterseiten) bleiben erhalten** wie bisher. Die Übersicht wird nur aufgeräumt.

**Reiter „Kalkulation“:** bleibt die große, vollständige Kalkulation, wird an `KALKULATION_ETW.md` angepasst
(Timos Excel als Vorlage, vorerst nur ETW). Die Prüfwerte in Abschnitt 3 der Datei müssen exakt herauskommen.
Für Mehrfamilienhäuser vorerst Hinweis „MFH-Kalkulation folgt“, bestehende Rechnung als Übergang behalten.

**Reiter „Dateien“ im Ankauf:** eine einfache Liste ohne Unterordner, Hochladen per Ziehen.
Ablauf (Speicherung in Google Drive kommt mit Phase 2, bis dahin wie bisher nur in der Sitzung):
- Eingang: kein Ordner.
- Ab Stufe „Neu“: **ein** Ordner `01 Ankauf/[Bezeichnung]` ohne Unterordner.
- Bei „Gekauft“: Projektstruktur (siehe Aufgabe 1) anlegen, Ordner nach `02_Projekte/` verschieben,
  Dateien einsortieren, die Plattform schlägt den Zielordner je Datei vor. Objekt wechselt zu „Projekte“.
- Bei „No Deal“/„Unqualifiziert“: Ordner bleibt unter `01 Ankauf/` (bzw. `_Archiv`), nichts wird gelöscht.

### 3. Objektprüfung (Ankauf)
Neuer Reiter „Prüfung“ im Ankauf, Checkliste mit Ampel und Zähler „x von y erledigt“.

**Unterlagen** (je: fehlt / angefordert / liegt vor, optional mit Dokument verknüpft):
Grundbuchauszug, Teilungserklärung, Aufteilungsplan, WEG-Protokolle (3 Jahre), Wirtschaftsplan,
Hausgeld-Jahresabrechnung, Rücklagennachweis, Energieausweis, Grundriss, Mietvertrag/Mieterliste.
Bei MFH statt WEG-Unterlagen: Mietaufstellung, Nebenkostenabrechnung, Baupläne.

**Prüfpunkte** (je: offen / ok / kritisch + Notiz):
Sonderumlagen beschlossen oder geplant, Höhe der Erhaltungsrücklage, anstehende Beschlüsse/Maßnahmen,
Hausgeld plausibel, Stellplatz/TG mit eigenem Grundbuch, Mietverhältnis und Kündigungsfristen,
Denkmalschutz/Erbbaurecht, Altlasten/Baulasten.

Regel: Wechsel in „Verhandlung“ bzw. „Angekauft“ zeigt einen Hinweis, wenn Pflichtpunkte offen oder kritisch sind
(Warnung, keine harte Sperre). Prüfstand in Objektliste und Übersicht sichtbar machen.

### 4. Ummeldungen (Projektsteuerung)
Neuer Reiter „Ummeldungen“ im Projekt. Wird beim Setzen von `besitzuebergangAm` automatisch angelegt:
Hausverwaltung, Gas, Strom, Wasser/Stadtwerke, Versicherung, Schornsteinfeger, Grundbesitzabgaben Stadt.

Je Eintrag: Status (offen / gemeldet / bestätigt / entfällt), Anbieter/Kontakt, Zählernummer, Zählerstand,
Datum gemeldet, Datum bestätigt, Notiz. Gas/Strom/Wasser mit Zählerstand-Feld.
Offene Ummeldungen älter als 14 Tage erscheinen als Aufgabe/Hinweis auf der Startseite.
Beim Verkauf einer Einheit dieselbe Liste als **Abmeldungen** an den Käufer.

### 4b. Ankauf-Eingang (Deal-Datenbank)
Erst nach Aufgabe 4 umsetzen.

Alle Angebote an ankauf@revest-projekt.de (Makler und ImmoMetrica-Suchaufträge,
ca. 60 pro Woche, ca. 3.000 pro Jahr) landen im System. Ziel: interne Datenbank,
wann welches Objekt zu welchem Preis angeboten wurde.

Eingang als eigene Liste vor der Pipeline (keine Pipeline-Spalte):
- Datensatz je Angebot: Adresse, Preis, m², Objektart, Absender/Makler,
  Eingangsdatum, Quelle, Exposé-PDF, Mailtext.
- Sichten in Sekunden: „Interessant“ → Stufe Neu, „Aussortiert“ → Ablage mit
  optionalem Grund. Tastenkürzel am Rechner (z. B. J/N und Pfeiltasten),
  Wischen am Handy. Ziel: 12 Angebote am Tag in 2–3 Minuten.
- Vorsortierung nach Suchprofil (in Einstellungen pflegbar: Städte/Stadtteile,
  Objektarten, max. Preis je m², Preisspanne): Angebote außerhalb des Profils
  werden markiert und unten einsortiert, nicht gelöscht.
- Wiedererkennung: gleiche Adresse (normalisiert) → neue Preisnennung an das
  bestehende Objekt hängen (angebote mit Art „forderung“, Quelle, Datum) und
  Hinweis zeigen: „Bekannt seit …, damals …“.
- Aussortiertes bleibt durchsuchbar (Adresse, Stadtteil, Makler, Preisspanne,
  Zeitraum).

Stufe 1 (ohne Backend): Schnellerfassung: Mailtext einfügen → Adresse, Preis,
m² per Mustererkennung vorausfüllen, Rest von Hand. Wiedererkennung und Sichten
funktionieren schon lokal.

Stufe 2 (mit Supabase): automatischer Import per n8n (neue Mail an ankauf@ →
Datenbank). ImmoMetrica-Mails per festem Muster auslesen, Makler-Mails und
Exposé-PDFs per Claude API auslesen. Erkannte Werte beim Sichten prüfbar und
korrigierbar.

### 5. Danach (Phase 2)
- Supabase als Datenbank und echte Anmeldung für mehrere Nutzer
- Übernahme der Leads aus monday (CSV-Export), Zuordnung der monday-Gruppen zu den Stufen:
  00/01 → Kontakt/Prüfung, 02/03 → Verhandlung, 04 → Angekauft, 90 Watchlist → Beobachtung mit Ankaufslimit,
  91 Unqualifiziert und 99 No Deal → Kein Deal mit Absagegrund
  (Hinweis: Mit Aufgabe 2b gilt laut Briefing die Zuordnung 1:1, weil monday dieselben Stufen nutzt.)
- Drive: Objektordner automatisch anlegen
- Qonto: Kosten je Objekt über das Kürzel-Label
