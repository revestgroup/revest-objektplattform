# Feinschliff Runde 1

Stand 08.11.2026 · Ergebnis aus Timos Durchsicht und der Prüfung der lokalen App.
Je Punkt kleine, prüfbare Änderung. Gern in 3 Branches: A (Ankauf), B (Kalkulation), C (Projekte).

## A. Ankauf

**Pipeline**
1. Spalten schmaler, sodass alle 7 aktiven Stufen bei 1440 px Breite ohne Scrollen sichtbar sind.
1b. **Seitlich bewegen muss einfach gehen** (aktuell kommt Timo nicht über „Terminiert“ hinaus):
    - Pipeline mit gedrückter Maus auf freier Fläche nach links/rechts ziehen (Greifen-Cursor).
    - Zusätzlich Pfeilknöpfe links/rechts am Rand und eine sichtbare Scrollleiste.
    - Trackpad und Shift + Mausrad scrollen seitlich.
    - Karten ziehen (Stufe wechseln) funktioniert weiterhin; beim Ziehen einer Karte an den Rand scrollt die Pipeline mit.
2. Leere Spalten: statt großem „Leer“-Kasten nur eine dünne gestrichelte Ablagefläche.
3. Ansprechpartner auf der Karte nicht abschneiden: Firma ODER Person zeigen, Telefon als Symbol.

**Objektkarte**
3b. **Öffnet als großes Fenster über der Pipeline** (wie monday), nicht als eigene Seite:
    - Fenster ca. 92 % der Breite, max. 1440 px, oben ca. 24 px Abstand, abgerundet, Schatten;
      Pipeline bleibt dahinter abgedunkelt sichtbar.
    - Schließen per X oben rechts, Esc-Taste oder Klick auf den dunklen Hintergrund; danach steht die Pipeline
      unverändert an derselben Scroll-Position.
    - Oben rechts Pfeile hoch/runter (bzw. Tasten J/K) zum vorherigen/nächsten Objekt derselben Stufe, ohne zu schließen.
    - Inhalt scrollt innerhalb des Fensters, Kopf und Reiter bleiben oben stehen.
    - Adresse behält `?objekt=…`, damit Links auf ein Objekt weiter funktionieren und Zurück im Browser das Fenster schließt.
    - Am Handy füllt das Fenster den ganzen Bildschirm.
    - Gilt genauso für Projekte.
4. Kopf kompakter: „Bearbeiten“ in dieselbe Zeile wie die anderen Knöpfe, weniger Höhe gesamt.
5. **Stufenleiste wie in monday** statt der Knöpfe „Deal – Objekt ankaufen“ und „No Deal“:
   - Unter dem Kopf eine durchgehende Leiste aus Pfeil-Segmenten mit allen Stufen in Pipeline-Reihenfolge
     (Neu · Unterlagen angefordert · Qualifiziert · Terminiert/Besichtigt · Angebot abgegeben · Nachfassen ·
     Watchlist · Unqualifiziert), aktuelle Stufe dunkel hervorgehoben, erledigte Stufen etwas kräftiger als kommende.
   - Rechts daneben zwei abgesetzte Knöpfe: **„Gekauft“ (grün)** und **„No Deal“ (rot)**.
   - Klick auf ein Segment setzt die Stufe sofort. „Gekauft“ öffnet weiterhin den bestehenden Deal-Dialog
     (inkl. Warnung bei offenen/kritischen Prüfpunkten), „No Deal“ fragt nach dem Absagegrund.
   - Lange Namen gekürzt mit Tooltip; am Handy wischbar.
   - Die Chips „Stufe wechseln“ unten in der Übersicht entfallen dann.
6. Zahlen an den Reitern vereinheitlichen: nur offene Dinge zählen (offene Prüfpunkte, offene Aufgaben,
   Anzahl Dateien). Bei Kalkulation keine Zahl.
7. Reiter „Kosten“ im Ankauf **komplett entfernen** (Kosten laufen über die Kalkulation). Im Projekt bleibt er.

**Checkliste Ankauf** (bisher Reiter „Prüfung“), Layout nach Entwurf `entwurf_checkliste.dc.html`
8. Reiter und Überschrift heißen **„Checkliste Ankauf“**.
8a. **Alles auf einen Blick ohne Scrollen** (1440 × 900): zwei Spalten nebeneinander, links Unterlagen, rechts Prüfpunkte,
    kompakte Zeilen (ca. 32 px), am Handy untereinander.
8b. **Durchnummeriert** über beide Spalten: Unterlagen 1–10, Prüfpunkte 11–18.
8c. **Unterlagen:** ganz links ein runder Haken, grün gefüllt sobald „liegt vor“ (Klick auf den Haken setzt
    „liegt vor“ bzw. zurück). Rechts kleiner Dreifach-Schalter fehlt / angefordert / liegt vor (rot / gelb / grün).
    PFLICHT als kleine Markierung hinter dem Namen, bei „liegt vor“ der zugeordnete Dateiname klein daneben.
8d. **Prüfpunkte nur zum Abhaken:** Haken = geprüft und ok (grün). Kleines Dreieck daneben markiert „kritisch“
    (Haken wird rot, Warnung beim Ankauf bleibt). Notiz als schmales Feld in derselben Zeile, keine eigene Zeile.
8e. Kopf: „x von 18 erledigt“, Fortschrittsbalken, „n kritisch“ in Rot, falls vorhanden.
8f. Dateien automatisch zuordnen: Enthält ein Dateiname den Unterlagentyp (z. B. „Grundbuch“, „Teilungserklaerung“,
    „WEG_Protokoll“, „Energieausweis“, „Grundriss“, „Wirtschaftsplan“, „Hausgeld“, „Mietvertrag“), wird die Datei
    zugeordnet und der Punkt auf „liegt vor“ gesetzt. Manuell änderbar.
8g. In der Übersicht heißt die Kachel ebenfalls „Checkliste Ankauf“ mit „x/18“.

**Kontakte** (Reiter „Kontakt“ heißt künftig **„Kontakte“**, in Ankauf und Projekt), Layout nach Entwurf `entwurf_kontakte.dc.html`
8h. Alle Kontakte als **kleine Kacheln im Raster** (ca. 260 px breit, mehrere nebeneinander), alles auf einer Seite
    ohne Scrollen: Name, Rolle als kleines Etikett, Telefon (antippbar, `tel:`), E-Mail (antippbar, `mailto:`),
    Notiz auf 2 Zeilen gekürzt, kleine Symbolknöpfe Bearbeiten / Entfernen.
8i. **Neuer Kontakt direkt in der Kachelreihe:** letzte Kachel „+ Kontakt hinzufügen“ (gestrichelt). Klick öffnet
    an derselben Stelle ein kleines Formular (Name/Firma, Rolle, Telefon, E-Mail), Speichern legt die Kachel an.
    Kein separates Fenster.
8j. Die Kontaktspalte in der Übersicht nutzt dieselben Kacheln, nur einspaltig.

## B. Kalkulation

9. Layout nach dem freigegebenen Entwurf `entwurf_kalkulation.dc.html` (Excel-Stil):
   - Eingaben links in den Abschnitten 1–8 der Excel, kompakte Zeilen (30 px), Ergebnis je Zeile rechts daneben
     (z. B. Grunderwerbsteuer 5 % → 9.250 €).
   - Rechts das Ergebnis Worst/Mid/Best, **bleibt beim Scrollen stehen** (sticky), darunter drei Kacheln
     Gewinn-% und die Bank-Ansicht Mid-Case.
   - Gelbe Felder = Eingabe, weiße = berechnet, kleine Legende oben.
   - Aufwertungskatalog darunter, volle Breite: nur Gewerke mit Werten aufgeklappt, Knopf „Alle Positionen zeigen“.
   - Kostenschätzung leer = Katalogsumme.
10. Alle Beträge formatiert (545.000 statt 545000), auch in Eingabefeldern nach Verlassen des Felds.
11. Feld „Abzug Stellplatz / Garage“ (Standard 0), Ergebniszeile „€/m² Wohnfläche“. Siehe `KALKULATION_ETW.md`.

## C. Projekte

12. **Reiter „Dokumente“ heißt „Drive“** und zeigt das Google-Drive-Symbol (offizielles Icon, nicht nachgezeichnet).
    Inhalt: der Drive-Ordner des Projekts direkt eingebettet. Schnelle Lösung ohne Google-API:
    `https://drive.google.com/embeddedfolderview?id=<ORDNER-ID>#list` als iframe (funktioniert, wenn man im Browser
    bei Google angemeldet ist). Dazu Knopf „In Drive öffnen“ (neuer Tab, dort hochladen).
    Ordner-ID aus dem Feld `driveOrdnerUrl` lesen; fehlt sie, Feld zum Einfügen des Links anzeigen.
    Volle Integration (Hochladen aus der Plattform) erst mit Phase 2.
13. **Einheiten als kompakte Liste/Tabelle**, eine Zeile je Einheit:
    Nr. · Geschoss · m² · Zimmer · Nutzung (ETW/WG) · Status · Mieter/Leerstand.
    Keine Verkaufsdetails (Käufer, Preis, Reservierung): der Vertrieb läuft extern in der Vertriebssoftware.
    Summenzeile: Anzahl Einheiten, m² gesamt.
14. **Teilung:** die vier Stufen (Vorbereitung, Beim Notar, Beim Grundbuchamt, Eingetragen) klein und
    nebeneinander in einer Zeile, als Schrittleiste. Details (Notar, Einheiten, erwartet am, Notiz) darunter kompakt.
15. **Ummeldungen, Fehler:** Bei Projekten mit eingetragenem Besitzübergang, aber leerer Liste (z. B. Fährgasse 6),
    die Standardliste automatisch anlegen, oder Knopf „Ummeldungen anlegen“.

## D. Kontaktregister (neuer Menüpunkt „Kontakte“)

Ein zentrales Register aller Kontakte, ersetzt das monday-Board „Kontakte“. **In der linken Menüleiste als eigener Punkt „Kontakte“** (Symbol Personen, zwischen „Projekte“ und „To Do’s“; am Handy in der unteren Leiste). Marketinglisten bleiben in Brevo.

16. **Datenmodell:** Kontakte werden eigene Datensätze mit ID. Ein Objekt verweist nur noch auf Kontakte
    (Kontakt-ID + Rolle in diesem Objekt). Ein Makler mit 12 Objekten existiert also einmal, und an seiner Karte
    sieht man alle 12 Objekte. Bestehende Objekt-Kontakte beim Laden in das Register übernehmen (Dubletten über
    E-Mail/Telefon/Name zusammenführen).
17. **Felder:** Name, Firma, Kategorie (eine oder mehrere), Telefon, Mobil, E-Mail, Ort/Region, Status, Quelle,
    Notizen (Verlauf mit Datum wie beim Objekt), verknüpfte Objekte (automatisch), letzter Kontakt (Datum).
18. **Kategorien** (aus monday übernommen, in 4 Gruppen sortiert, in Einstellungen pflegbar):
    - *Ankauf / Quellen:* Makler, Eigentümer, Tippgeber, Projektentwickler, Insolvenzverwalter,
      Genossenschaft / Wohnungsbaugesellschaft
    - *Kapital / Käufer:* Immobilieninvestor, Family Office, Kaufinteressent, Bank, Finanzberater
    - *Objekt / Abwicklung:* Hausverwaltung, Notar, Handwerker / Dienstleister, Versicherung, Versorger
      (Stadtwerke, Gas, Strom), Amt / Behörde, Berater (Anwalt, Steuer)
    - *Sonstiges*
    Farben wie bisher je Kategorie, aber gedämpft und je Gruppe ähnlich.
19. **Status:** Neu · ToDo · Kontaktiert · Aktiv (laufende Zusammenarbeit) · Inaktiv.
20. **Registeransicht:** kompakte Tabelle (Name, Firma, Kategorie, Telefon, E-Mail, Ort, Status, Objekte, letzter Kontakt),
    Suche über alles, Filter-Chips nach Gruppe/Kategorie und Status, Sortierung je Spalte,
    gespeicherte Ansichten wie in monday (z. B. „Alle Makler“, „Handwerker“, „Kontaktieren“).
21. **Kontakt öffnen:** gleiches großes Fenster wie beim Objekt (siehe 3b): links Kontaktdaten, Mitte Notizen,
    rechts verknüpfte Objekte mit Stufe. Knopf „E-Mail schreiben“.
22. **Im Objekt:** „+ Kontakt hinzufügen“ sucht zuerst im Register (Name, Firma, Telefon); nur wenn nichts passt,
    wird ein neuer Kontakt angelegt, der automatisch ins Register kommt.
23. **Versorger** aus dem Register werden bei den Ummeldungen als Anbieter auswählbar.
24. Übernahme aus monday: CSV-Import mit Zuordnung der Spalten (Phase 2, zusammen mit Supabase).

## E. Backoffice (neuer Menüpunkt „Backoffice“, ersetzt das Trello-Board)

Zentraler Posteingang für alles, was reinkommt: Briefe, gescannte Dokumente, Rechnungen, To-dos. Simpel wie Trello.

25. **Board mit Spalten** (Karten per Ziehen verschieben, wie die Pipeline inkl. seitlichem Ziehen aus 1b):
    - Arbeitsspalten: **Posteingang · Besprechung · In Arbeit · Erledigt**
    - Weiterleiten-Spalten (rechts, farblich abgesetzt): **→ Qonto · → Projekt · → Ablage**
26. **Karte:** Titel, Vorschau des Dokuments (PDF/Bild), Quelle (Scan, Upload, Mail), Eingangsdatum, Art
    (Rechnung, Brief, Vertrag, Behörde, To-do, Sonstiges), optional Objekt, Gesellschaft, Fälligkeit, Notizen,
    Checkliste. Öffnet im großen Fenster wie ein Objekt (3b).
27. **Neue Karten:** Datei(en) per Drag & Drop auf „Posteingang“ ziehen = je Datei eine Karte; Knopf „+ Karte“ für reine To-dos.
    Phase 2: Scans aus Drive `00_Posteingang` und Mails an info@ erscheinen automatisch im Posteingang.
28. **Weiterleiten-Spalten lösen eine Aktion aus** (vorher kurze Bestätigung im Fenster):
    - **→ Qonto:** Rechnung wird als Beleg an Qonto übergeben (Phase 2: über die Qonto-Belegadresse per Mail
      oder die Qonto-API, je nachdem was zuverlässiger ist), optional mit Objektkürzel als Label-Hinweis.
      Danach Karte automatisch nach „Erledigt“ mit Vermerk „an Qonto übergeben am …“.
    - **→ Projekt:** Auswahl Objekt (Suche nach Kürzel/Adresse) und Zielordner (Vorschlag nach Dokumentart).
      Datei wird im Objekt unter Drive/Dateien abgelegt (Phase 2: echte Ablage im Drive-Ordner des Objekts),
      im Objektverlauf vermerkt, Karte → „Erledigt“.
    - **→ Ablage:** Auswahl Gesellschaft (Revest Projekt, Revest Asset, Sanero, IMPERA, AUVERO, GT Projekt, Privat)
      und Ordner (z. B. 05_Finanzen & Steuer, 06_Unternehmen). Phase 2: Datei landet im passenden Drive-Ordner.
    - Bis Phase 2 werden die Aktionen nur vermerkt (Karte zeigt „wartet auf Übergabe“), damit der Ablauf schon testbar ist.
29. **Zähler** in der Menüleiste: Anzahl Karten im Posteingang. Ziel: Posteingang abends leer.
30. **Filter:** Art, Gesellschaft, Objekt, „mir zugewiesen“ (für später mit Halbtagskraft).
31. Abgrenzung: **To Do’s** bleiben Aufgaben an Objekten; eine Backoffice-Karte kann per Knopf in eine Aufgabe am Objekt
    umgewandelt werden.
