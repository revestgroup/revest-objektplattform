export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      aktivitaeten: {
        Row: {
          archiviert_am: string | null
          art: string
          erstellt_am: string
          erstellt_von: string | null
          extern_id: string | null
          geaendert_am: string
          id: string
          mail: Json | null
          objekt_id: string
          quelle: string | null
          stufe: string | null
          telefonat: Json | null
          termin: Json | null
          text: string
          verfasser: string | null
          von_hand: boolean | null
          zeitpunkt: string
        }
        Insert: {
          archiviert_am?: string | null
          art: string
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          geaendert_am?: string
          id?: string
          mail?: Json | null
          objekt_id: string
          quelle?: string | null
          stufe?: string | null
          telefonat?: Json | null
          termin?: Json | null
          text?: string
          verfasser?: string | null
          von_hand?: boolean | null
          zeitpunkt?: string
        }
        Update: {
          archiviert_am?: string | null
          art?: string
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          geaendert_am?: string
          id?: string
          mail?: Json | null
          objekt_id?: string
          quelle?: string | null
          stufe?: string | null
          telefonat?: Json | null
          termin?: Json | null
          text?: string
          verfasser?: string | null
          von_hand?: boolean | null
          zeitpunkt?: string
        }
        Relationships: [
          {
            foreignKeyName: "aktivitaeten_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aktivitaeten_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      angebote: {
        Row: {
          archiviert_am: string | null
          art: string
          datum: string
          ergebnis: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          notiz: string | null
          objekt_id: string
          preis: number
          quelle: string | null
        }
        Insert: {
          archiviert_am?: string | null
          art: string
          datum: string
          ergebnis?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          notiz?: string | null
          objekt_id: string
          preis: number
          quelle?: string | null
        }
        Update: {
          archiviert_am?: string | null
          art?: string
          datum?: string
          ergebnis?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          notiz?: string | null
          objekt_id?: string
          preis?: number
          quelle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "angebote_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebote_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      angebotseingang: {
        Row: {
          absender: string | null
          absender_email: string | null
          archiviert_am: string | null
          eingang_am: string
          erstellt_am: string
          erstellt_von: string | null
          expose_name: string | null
          flaeche: number | null
          geaendert_am: string
          gesichtet_am: string | null
          grund: string | null
          id: string
          kontakt_id: string | null
          mailtext: string | null
          objekt_id: string | null
          objektart: string | null
          plz: string
          preis: number | null
          quelle: string
          stadt: string
          stadtteil: string | null
          status: string
          strasse: string
          zimmer: number | null
        }
        Insert: {
          absender?: string | null
          absender_email?: string | null
          archiviert_am?: string | null
          eingang_am?: string
          erstellt_am?: string
          erstellt_von?: string | null
          expose_name?: string | null
          flaeche?: number | null
          geaendert_am?: string
          gesichtet_am?: string | null
          grund?: string | null
          id?: string
          kontakt_id?: string | null
          mailtext?: string | null
          objekt_id?: string | null
          objektart?: string | null
          plz?: string
          preis?: number | null
          quelle?: string
          stadt?: string
          stadtteil?: string | null
          status?: string
          strasse: string
          zimmer?: number | null
        }
        Update: {
          absender?: string | null
          absender_email?: string | null
          archiviert_am?: string | null
          eingang_am?: string
          erstellt_am?: string
          erstellt_von?: string | null
          expose_name?: string | null
          flaeche?: number | null
          geaendert_am?: string
          gesichtet_am?: string | null
          grund?: string | null
          id?: string
          kontakt_id?: string | null
          mailtext?: string | null
          objekt_id?: string | null
          objektart?: string | null
          plz?: string
          preis?: number | null
          quelle?: string
          stadt?: string
          stadtteil?: string | null
          status?: string
          strasse?: string
          zimmer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "angebotseingang_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebotseingang_kontakt_id_fkey"
            columns: ["kontakt_id"]
            isOneToOne: false
            referencedRelation: "kontakte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angebotseingang_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      aufgaben: {
        Row: {
          archiviert_am: string | null
          art: string
          bereich: string | null
          beschreibung: string | null
          dringlichkeit: string
          erledigt_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          faellig_am: string | null
          geaendert_am: string
          id: string
          objekt_id: string | null
          titel: string
          zeitblock_bis: string | null
          zeitblock_von: string | null
          zustaendig: string
        }
        Insert: {
          archiviert_am?: string | null
          art?: string
          bereich?: string | null
          beschreibung?: string | null
          dringlichkeit?: string
          erledigt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          geaendert_am?: string
          id?: string
          objekt_id?: string | null
          titel: string
          zeitblock_bis?: string | null
          zeitblock_von?: string | null
          zustaendig?: string
        }
        Update: {
          archiviert_am?: string | null
          art?: string
          bereich?: string | null
          beschreibung?: string | null
          dringlichkeit?: string
          erledigt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          geaendert_am?: string
          id?: string
          objekt_id?: string | null
          titel?: string
          zeitblock_bis?: string | null
          zeitblock_von?: string | null
          zustaendig?: string
        }
        Relationships: [
          {
            foreignKeyName: "aufgaben_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aufgaben_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      backoffice_karten: {
        Row: {
          archiviert_am: string | null
          art: string
          checkliste: Json
          datei_name: string | null
          datei_typ: string | null
          eingang_am: string
          erstellt_am: string
          erstellt_von: string | null
          faellig_am: string | null
          geaendert_am: string
          gesellschaft: string | null
          id: string
          notizen: string | null
          objekt_id: string | null
          quelle: string
          spalte: string
          titel: string
          uebergabe_am: string | null
          uebergabe_details: string | null
          uebergabe_extern_id: string | null
          uebergabe_geaendert_am: string | null
          uebergabe_grund: string | null
          uebergabe_link: string | null
          uebergabe_status: string | null
          uebergabe_ziel: string | null
          verlauf: Json
          zugewiesen_an: string | null
          zustaendig: string
        }
        Insert: {
          archiviert_am?: string | null
          art?: string
          checkliste?: Json
          datei_name?: string | null
          datei_typ?: string | null
          eingang_am?: string
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          geaendert_am?: string
          gesellschaft?: string | null
          id?: string
          notizen?: string | null
          objekt_id?: string | null
          quelle?: string
          spalte?: string
          titel: string
          uebergabe_am?: string | null
          uebergabe_details?: string | null
          uebergabe_extern_id?: string | null
          uebergabe_geaendert_am?: string | null
          uebergabe_grund?: string | null
          uebergabe_link?: string | null
          uebergabe_status?: string | null
          uebergabe_ziel?: string | null
          verlauf?: Json
          zugewiesen_an?: string | null
          zustaendig?: string
        }
        Update: {
          archiviert_am?: string | null
          art?: string
          checkliste?: Json
          datei_name?: string | null
          datei_typ?: string | null
          eingang_am?: string
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          geaendert_am?: string
          gesellschaft?: string | null
          id?: string
          notizen?: string | null
          objekt_id?: string | null
          quelle?: string
          spalte?: string
          titel?: string
          uebergabe_am?: string | null
          uebergabe_details?: string | null
          uebergabe_extern_id?: string | null
          uebergabe_geaendert_am?: string | null
          uebergabe_grund?: string | null
          uebergabe_link?: string | null
          uebergabe_status?: string | null
          uebergabe_ziel?: string | null
          verlauf?: Json
          zugewiesen_an?: string | null
          zustaendig?: string
        }
        Relationships: [
          {
            foreignKeyName: "backoffice_karten_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backoffice_karten_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backoffice_karten_zugewiesen_an_fkey"
            columns: ["zugewiesen_an"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      dokumente: {
        Row: {
          archiviert_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          groesse_kb: number | null
          hochgeladen_am: string
          id: string
          name: string
          objekt_id: string
          ordner: string
          speicherpfad: string | null
        }
        Insert: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          groesse_kb?: number | null
          hochgeladen_am?: string
          id?: string
          name: string
          objekt_id: string
          ordner?: string
          speicherpfad?: string | null
        }
        Update: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          groesse_kb?: number | null
          hochgeladen_am?: string
          id?: string
          name?: string
          objekt_id?: string
          ordner?: string
          speicherpfad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dokumente_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dokumente_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      einheiten: {
        Row: {
          abstellraum_nr: string | null
          archiviert_am: string | null
          bezeichnung: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geschoss: string
          id: string
          kaeufer: string | null
          kaeufer_kontakt: string | null
          kaltmiete: number | null
          nutzung: string | null
          objekt_id: string
          status: string
          stellplatz_nr: string | null
          uebergabe_am: string | null
          verkaufspreis: number | null
          verkauft_am: string | null
          wohnflaeche: number | null
          wohnungs_nr: string | null
          zimmer: number | null
        }
        Insert: {
          abstellraum_nr?: string | null
          archiviert_am?: string | null
          bezeichnung?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geschoss?: string
          id?: string
          kaeufer?: string | null
          kaeufer_kontakt?: string | null
          kaltmiete?: number | null
          nutzung?: string | null
          objekt_id: string
          status?: string
          stellplatz_nr?: string | null
          uebergabe_am?: string | null
          verkaufspreis?: number | null
          verkauft_am?: string | null
          wohnflaeche?: number | null
          wohnungs_nr?: string | null
          zimmer?: number | null
        }
        Update: {
          abstellraum_nr?: string | null
          archiviert_am?: string | null
          bezeichnung?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geschoss?: string
          id?: string
          kaeufer?: string | null
          kaeufer_kontakt?: string | null
          kaltmiete?: number | null
          nutzung?: string | null
          objekt_id?: string
          status?: string
          stellplatz_nr?: string | null
          uebergabe_am?: string | null
          verkaufspreis?: number | null
          verkauft_am?: string | null
          wohnflaeche?: number | null
          wohnungs_nr?: string | null
          zimmer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "einheiten_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "einheiten_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      einstellungen: {
        Row: {
          archiviert_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          schluessel: string
          wert: Json
        }
        Insert: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          schluessel: string
          wert?: Json
        }
        Update: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          schluessel?: string
          wert?: Json
        }
        Relationships: [
          {
            foreignKeyName: "einstellungen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      fragen: {
        Row: {
          antwort: string | null
          antworten: string[]
          archiviert_am: string | null
          beantwortet_am: string | null
          beantwortet_von: string | null
          bezug_art: string | null
          bezug_id: string | null
          bezug_titel: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          objekt_id: string | null
          text: string
          von: string
        }
        Insert: {
          antwort?: string | null
          antworten?: string[]
          archiviert_am?: string | null
          beantwortet_am?: string | null
          beantwortet_von?: string | null
          bezug_art?: string | null
          bezug_id?: string | null
          bezug_titel?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          objekt_id?: string | null
          text: string
          von?: string
        }
        Update: {
          antwort?: string | null
          antworten?: string[]
          archiviert_am?: string | null
          beantwortet_am?: string | null
          beantwortet_von?: string | null
          bezug_art?: string | null
          bezug_id?: string | null
          bezug_titel?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          objekt_id?: string | null
          text?: string
          von?: string
        }
        Relationships: [
          {
            foreignKeyName: "fragen_beantwortet_von_fkey"
            columns: ["beantwortet_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fragen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fragen_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      garantie_zimmer: {
        Row: {
          archiviert_am: string | null
          bezeichnung: string
          erstellt_am: string
          erstellt_von: string | null
          flaeche: number | null
          garantie_id: string
          geaendert_am: string
          id: string
          miete: number
        }
        Insert: {
          archiviert_am?: string | null
          bezeichnung?: string
          erstellt_am?: string
          erstellt_von?: string | null
          flaeche?: number | null
          garantie_id: string
          geaendert_am?: string
          id?: string
          miete?: number
        }
        Update: {
          archiviert_am?: string | null
          bezeichnung?: string
          erstellt_am?: string
          erstellt_von?: string | null
          flaeche?: number | null
          garantie_id?: string
          geaendert_am?: string
          id?: string
          miete?: number
        }
        Relationships: [
          {
            foreignKeyName: "garantie_zimmer_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantie_zimmer_garantie_id_fkey"
            columns: ["garantie_id"]
            isOneToOne: false
            referencedRelation: "mietgarantien"
            referencedColumns: ["id"]
          },
        ]
      }
      gedanken: {
        Row: {
          archiviert_am: string | null
          besitzer_id: string
          erstellt_am: string
          erstellt_von: string | null
          extern_id: string | null
          geaendert_am: string
          id: string
          ki_vorschlag: string | null
          quelle: string
          sortiert_am: string | null
          text: string
          verweis_id: string | null
          ziel: string | null
          zustaendig: string
        }
        Insert: {
          archiviert_am?: string | null
          besitzer_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          geaendert_am?: string
          id?: string
          ki_vorschlag?: string | null
          quelle?: string
          sortiert_am?: string | null
          text: string
          verweis_id?: string | null
          ziel?: string | null
          zustaendig?: string
        }
        Update: {
          archiviert_am?: string | null
          besitzer_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          geaendert_am?: string
          id?: string
          ki_vorschlag?: string | null
          quelle?: string
          sortiert_am?: string | null
          text?: string
          verweis_id?: string | null
          ziel?: string | null
          zustaendig?: string
        }
        Relationships: [
          {
            foreignKeyName: "gedanken_besitzer_id_fkey"
            columns: ["besitzer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gedanken_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ideen: {
        Row: {
          archiviert_am: string | null
          besitzer_id: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          text: string
        }
        Insert: {
          archiviert_am?: string | null
          besitzer_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          text: string
        }
        Update: {
          archiviert_am?: string | null
          besitzer_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideen_besitzer_id_fkey"
            columns: ["besitzer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      kontakt_notizen: {
        Row: {
          archiviert_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          kontakt_id: string
          text: string
          verfasser: string | null
          zeitpunkt: string
        }
        Insert: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kontakt_id: string
          text: string
          verfasser?: string | null
          zeitpunkt?: string
        }
        Update: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kontakt_id?: string
          text?: string
          verfasser?: string | null
          zeitpunkt?: string
        }
        Relationships: [
          {
            foreignKeyName: "kontakt_notizen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontakt_notizen_kontakt_id_fkey"
            columns: ["kontakt_id"]
            isOneToOne: false
            referencedRelation: "kontakte"
            referencedColumns: ["id"]
          },
        ]
      }
      kontakte: {
        Row: {
          anschrift: string | null
          archiviert_am: string | null
          email: string | null
          erstellt_am: string
          erstellt_von: string | null
          firma: string | null
          geaendert_am: string
          id: string
          kategorien: string[]
          kontakt_nicht_gewuenscht: boolean
          letzter_kontakt: string | null
          mobil: string | null
          name: string
          ort: string | null
          quelle: string | null
          status: string
          telefon: string | null
        }
        Insert: {
          anschrift?: string | null
          archiviert_am?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma?: string | null
          geaendert_am?: string
          id?: string
          kategorien?: string[]
          kontakt_nicht_gewuenscht?: boolean
          letzter_kontakt?: string | null
          mobil?: string | null
          name?: string
          ort?: string | null
          quelle?: string | null
          status?: string
          telefon?: string | null
        }
        Update: {
          anschrift?: string | null
          archiviert_am?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma?: string | null
          geaendert_am?: string
          id?: string
          kategorien?: string[]
          kontakt_nicht_gewuenscht?: boolean
          letzter_kontakt?: string | null
          mobil?: string | null
          name?: string
          ort?: string | null
          quelle?: string | null
          status?: string
          telefon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kontakte_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      kontaktkategorien: {
        Row: {
          archiviert_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          gruppe: string
          id: string
          reihenfolge: number
          titel: string
        }
        Insert: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gruppe: string
          id?: string
          reihenfolge?: number
          titel: string
        }
        Update: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gruppe?: string
          id?: string
          reihenfolge?: number
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: "kontaktkategorien_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      mieter: {
        Row: {
          archiviert_am: string | null
          auszug_am: string | null
          beruf: string | null
          einzug_am: string | null
          email: string | null
          erstellt_am: string
          erstellt_von: string | null
          garantie_id: string | null
          geaendert_am: string
          id: string
          miete: number | null
          name: string
          notiz: string | null
          quelle: string
          status: string
          telefon: string | null
          vertrag: Json | null
          zimmer_id: string | null
        }
        Insert: {
          archiviert_am?: string | null
          auszug_am?: string | null
          beruf?: string | null
          einzug_am?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          garantie_id?: string | null
          geaendert_am?: string
          id?: string
          miete?: number | null
          name: string
          notiz?: string | null
          quelle?: string
          status?: string
          telefon?: string | null
          vertrag?: Json | null
          zimmer_id?: string | null
        }
        Update: {
          archiviert_am?: string | null
          auszug_am?: string | null
          beruf?: string | null
          einzug_am?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          garantie_id?: string | null
          geaendert_am?: string
          id?: string
          miete?: number | null
          name?: string
          notiz?: string | null
          quelle?: string
          status?: string
          telefon?: string | null
          vertrag?: Json | null
          zimmer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mieter_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mieter_garantie_id_fkey"
            columns: ["garantie_id"]
            isOneToOne: false
            referencedRelation: "mietgarantien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mieter_zimmer_id_fkey"
            columns: ["zimmer_id"]
            isOneToOne: false
            referencedRelation: "garantie_zimmer"
            referencedColumns: ["id"]
          },
        ]
      }
      mieter_vertraulich: {
        Row: {
          arbeitgeber: string | null
          archiviert_am: string | null
          buerge: Json | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geburtsdatum: string | null
          id: string
          mieter_id: string
          nettoeinkommen: number | null
          unterlagen: Json
        }
        Insert: {
          arbeitgeber?: string | null
          archiviert_am?: string | null
          buerge?: Json | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geburtsdatum?: string | null
          id?: string
          mieter_id: string
          nettoeinkommen?: number | null
          unterlagen?: Json
        }
        Update: {
          arbeitgeber?: string | null
          archiviert_am?: string | null
          buerge?: Json | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geburtsdatum?: string | null
          id?: string
          mieter_id?: string
          nettoeinkommen?: number | null
          unterlagen?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mieter_vertraulich_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mieter_vertraulich_mieter_id_fkey"
            columns: ["mieter_id"]
            isOneToOne: true
            referencedRelation: "mieter"
            referencedColumns: ["id"]
          },
        ]
      }
      mietgarantien: {
        Row: {
          adresse: string
          archiviert_am: string | null
          art: string
          beginn: string
          einheit_id: string | null
          einheit_titel: string
          erstellt_am: string
          erstellt_von: string | null
          garantiemiete: number
          geaendert_am: string
          id: string
          kaeufer: string
          kaeufer_kontakt: string | null
          laufzeit_monate: number
          notiz: string | null
          objekt_id: string | null
          sollmiete: number | null
          verkaufspreis: number | null
          verkauft_am: string | null
        }
        Insert: {
          adresse?: string
          archiviert_am?: string | null
          art: string
          beginn: string
          einheit_id?: string | null
          einheit_titel?: string
          erstellt_am?: string
          erstellt_von?: string | null
          garantiemiete: number
          geaendert_am?: string
          id?: string
          kaeufer?: string
          kaeufer_kontakt?: string | null
          laufzeit_monate: number
          notiz?: string | null
          objekt_id?: string | null
          sollmiete?: number | null
          verkaufspreis?: number | null
          verkauft_am?: string | null
        }
        Update: {
          adresse?: string
          archiviert_am?: string | null
          art?: string
          beginn?: string
          einheit_id?: string | null
          einheit_titel?: string
          erstellt_am?: string
          erstellt_von?: string | null
          garantiemiete?: number
          geaendert_am?: string
          id?: string
          kaeufer?: string
          kaeufer_kontakt?: string | null
          laufzeit_monate?: number
          notiz?: string | null
          objekt_id?: string | null
          sollmiete?: number | null
          verkaufspreis?: number | null
          verkauft_am?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mietgarantien_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mietgarantien_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mietgarantien_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      nachberechnung: {
        Row: {
          abgerechnet_am: string | null
          archiviert_am: string | null
          art: string
          beleg_name: string | null
          betrag: number | null
          bis: string | null
          einheit_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          extern_id: string | null
          geaendert_am: string
          id: string
          manuell_revest: number | null
          objekt_id: string
          platzhalter: boolean
          seite: string
          status: string
          titel: string | null
          von: string | null
          zahlungseingang: string | null
        }
        Insert: {
          abgerechnet_am?: string | null
          archiviert_am?: string | null
          art: string
          beleg_name?: string | null
          betrag?: number | null
          bis?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          geaendert_am?: string
          id?: string
          manuell_revest?: number | null
          objekt_id: string
          platzhalter?: boolean
          seite: string
          status?: string
          titel?: string | null
          von?: string | null
          zahlungseingang?: string | null
        }
        Update: {
          abgerechnet_am?: string | null
          archiviert_am?: string | null
          art?: string
          beleg_name?: string | null
          betrag?: number | null
          bis?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          geaendert_am?: string
          id?: string
          manuell_revest?: number | null
          objekt_id?: string
          platzhalter?: boolean
          seite?: string
          status?: string
          titel?: string | null
          von?: string | null
          zahlungseingang?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nachberechnung_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachberechnung_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachberechnung_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_geheim: {
        Row: {
          archiviert_am: string | null
          einheit_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          objekt_id: string
          schluesselbox_code: string | null
        }
        Insert: {
          archiviert_am?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          objekt_id: string
          schluesselbox_code?: string | null
        }
        Update: {
          archiviert_am?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          objekt_id?: string
          schluesselbox_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objekt_geheim_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_geheim_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_geheim_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_kontakte: {
        Row: {
          archiviert_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          kontakt_id: string
          notiz: string | null
          objekt_id: string
          rolle: string
        }
        Insert: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kontakt_id: string
          notiz?: string | null
          objekt_id: string
          rolle: string
        }
        Update: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kontakt_id?: string
          notiz?: string | null
          objekt_id?: string
          rolle?: string
        }
        Relationships: [
          {
            foreignKeyName: "objekt_kontakte_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_kontakte_kontakt_id_fkey"
            columns: ["kontakt_id"]
            isOneToOne: false
            referencedRelation: "kontakte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_kontakte_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      objekte: {
        Row: {
          absagegrund: string | null
          abschluss: Json | null
          angekauft_am: string | null
          ankaufslimit: number | null
          anzahl_einheiten: number | null
          archiviert_am: string | null
          aufteilung: Json | null
          baujahr: number | null
          besitzuebergang_am: string | null
          bezeichnung: string | null
          bilder: string[]
          breite: number
          bundesland: string
          datenraum: Json | null
          denkmalschutz: boolean
          drive_ordner_url: string | null
          energiekennwert: number | null
          energieklasse: string | null
          erbbaurecht: boolean
          erstellt_am: string
          erstellt_von: string | null
          etage: string | null
          frist_bis: string | null
          geaendert_am: string
          gesellschaft: string | null
          gewerbeflaeche: number | null
          grundstuecksflaeche: number | null
          hausgeld: number | null
          id: string
          infos: Json | null
          instandhaltungsruecklage: number | null
          jahres_nettokaltmiete: number | null
          kalkulation_etw: Json | null
          kaufpreis: number | null
          kuerzel: string | null
          kurznotiz: string | null
          laenge: number
          letzte_sanierung: number | null
          maklerprovision: number | null
          nachberechnung_stichtage: Json | null
          nachkalkulation: Json | null
          nicht_umlagefaehig: number | null
          notiz: string | null
          objektart: string
          paket: boolean
          plz: string
          potenzial_miete: number | null
          pruefung: Json | null
          quelle: string | null
          stadt: string
          stadtteil: string
          stellplatz: string | null
          strasse: string
          stufe: string
          teilung: Json | null
          uebergabe_ankauf: Json | null
          uebergabe_vorlage: Json | null
          umriss: Json | null
          verkaufsplan: Json | null
          vertriebsweg: string | null
          wg_zimmer: number | null
          wohnflaeche: number | null
          zimmer: number | null
          zustand: string
        }
        Insert: {
          absagegrund?: string | null
          abschluss?: Json | null
          angekauft_am?: string | null
          ankaufslimit?: number | null
          anzahl_einheiten?: number | null
          archiviert_am?: string | null
          aufteilung?: Json | null
          baujahr?: number | null
          besitzuebergang_am?: string | null
          bezeichnung?: string | null
          bilder?: string[]
          breite: number
          bundesland?: string
          datenraum?: Json | null
          denkmalschutz?: boolean
          drive_ordner_url?: string | null
          energiekennwert?: number | null
          energieklasse?: string | null
          erbbaurecht?: boolean
          erstellt_am?: string
          erstellt_von?: string | null
          etage?: string | null
          frist_bis?: string | null
          geaendert_am?: string
          gesellschaft?: string | null
          gewerbeflaeche?: number | null
          grundstuecksflaeche?: number | null
          hausgeld?: number | null
          id?: string
          infos?: Json | null
          instandhaltungsruecklage?: number | null
          jahres_nettokaltmiete?: number | null
          kalkulation_etw?: Json | null
          kaufpreis?: number | null
          kuerzel?: string | null
          kurznotiz?: string | null
          laenge: number
          letzte_sanierung?: number | null
          maklerprovision?: number | null
          nachberechnung_stichtage?: Json | null
          nachkalkulation?: Json | null
          nicht_umlagefaehig?: number | null
          notiz?: string | null
          objektart: string
          paket?: boolean
          plz?: string
          potenzial_miete?: number | null
          pruefung?: Json | null
          quelle?: string | null
          stadt?: string
          stadtteil?: string
          stellplatz?: string | null
          strasse: string
          stufe?: string
          teilung?: Json | null
          uebergabe_ankauf?: Json | null
          uebergabe_vorlage?: Json | null
          umriss?: Json | null
          verkaufsplan?: Json | null
          vertriebsweg?: string | null
          wg_zimmer?: number | null
          wohnflaeche?: number | null
          zimmer?: number | null
          zustand?: string
        }
        Update: {
          absagegrund?: string | null
          abschluss?: Json | null
          angekauft_am?: string | null
          ankaufslimit?: number | null
          anzahl_einheiten?: number | null
          archiviert_am?: string | null
          aufteilung?: Json | null
          baujahr?: number | null
          besitzuebergang_am?: string | null
          bezeichnung?: string | null
          bilder?: string[]
          breite?: number
          bundesland?: string
          datenraum?: Json | null
          denkmalschutz?: boolean
          drive_ordner_url?: string | null
          energiekennwert?: number | null
          energieklasse?: string | null
          erbbaurecht?: boolean
          erstellt_am?: string
          erstellt_von?: string | null
          etage?: string | null
          frist_bis?: string | null
          geaendert_am?: string
          gesellschaft?: string | null
          gewerbeflaeche?: number | null
          grundstuecksflaeche?: number | null
          hausgeld?: number | null
          id?: string
          infos?: Json | null
          instandhaltungsruecklage?: number | null
          jahres_nettokaltmiete?: number | null
          kalkulation_etw?: Json | null
          kaufpreis?: number | null
          kuerzel?: string | null
          kurznotiz?: string | null
          laenge?: number
          letzte_sanierung?: number | null
          maklerprovision?: number | null
          nachberechnung_stichtage?: Json | null
          nachkalkulation?: Json | null
          nicht_umlagefaehig?: number | null
          notiz?: string | null
          objektart?: string
          paket?: boolean
          plz?: string
          potenzial_miete?: number | null
          pruefung?: Json | null
          quelle?: string | null
          stadt?: string
          stadtteil?: string
          stellplatz?: string | null
          strasse?: string
          stufe?: string
          teilung?: Json | null
          uebergabe_ankauf?: Json | null
          uebergabe_vorlage?: Json | null
          umriss?: Json | null
          verkaufsplan?: Json | null
          vertriebsweg?: string | null
          wg_zimmer?: number | null
          wohnflaeche?: number | null
          zimmer?: number | null
          zustand?: string
        }
        Relationships: [
          {
            foreignKeyName: "objekte_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      persoenliche_einstellungen: {
        Row: {
          archiviert_am: string | null
          besitzer_id: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geschaeft_quartale: Json
          id: string
          impuls: Json
          tisch_vermerke: Json
          warum: string
        }
        Insert: {
          archiviert_am?: string | null
          besitzer_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geschaeft_quartale?: Json
          id?: string
          impuls?: Json
          tisch_vermerke?: Json
          warum?: string
        }
        Update: {
          archiviert_am?: string | null
          besitzer_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geschaeft_quartale?: Json
          id?: string
          impuls?: Json
          tisch_vermerke?: Json
          warum?: string
        }
        Relationships: [
          {
            foreignKeyName: "persoenliche_einstellungen_besitzer_id_fkey"
            columns: ["besitzer_id"]
            isOneToOne: true
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persoenliche_einstellungen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      posteingang_mails: {
        Row: {
          absender: string
          absender_email: string | null
          aktion: string
          archiviert_am: string | null
          betreff: string
          eingang_am: string
          erledigt_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          extern_id: string | null
          frist: string | null
          geaendert_am: string
          id: string
          kategorie: string | null
          objekt_id: string | null
          postfach: string
          quelle: string
          status: string
          text: string
          verweis: string | null
          zustaendig: string
        }
        Insert: {
          absender?: string
          absender_email?: string | null
          aktion?: string
          archiviert_am?: string | null
          betreff?: string
          eingang_am?: string
          erledigt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          frist?: string | null
          geaendert_am?: string
          id?: string
          kategorie?: string | null
          objekt_id?: string | null
          postfach: string
          quelle?: string
          status?: string
          text?: string
          verweis?: string | null
          zustaendig?: string
        }
        Update: {
          absender?: string
          absender_email?: string | null
          aktion?: string
          archiviert_am?: string | null
          betreff?: string
          eingang_am?: string
          erledigt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          frist?: string | null
          geaendert_am?: string
          id?: string
          kategorie?: string | null
          objekt_id?: string | null
          postfach?: string
          quelle?: string
          status?: string
          text?: string
          verweis?: string | null
          zustaendig?: string
        }
        Relationships: [
          {
            foreignKeyName: "posteingang_mails_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posteingang_mails_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      private_ziele: {
        Row: {
          archiviert_am: string | null
          besitzer_id: string
          erstellt_am: string
          erstellt_von: string | null
          fortschritt: number
          geaendert_am: string
          id: string
          jahr: number
          name: string
          quartale: boolean[]
          stand: string
        }
        Insert: {
          archiviert_am?: string | null
          besitzer_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          fortschritt?: number
          geaendert_am?: string
          id?: string
          jahr: number
          name: string
          quartale?: boolean[]
          stand?: string
        }
        Update: {
          archiviert_am?: string | null
          besitzer_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          fortschritt?: number
          geaendert_am?: string
          id?: string
          jahr?: number
          name?: string
          quartale?: boolean[]
          stand?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_ziele_besitzer_id_fkey"
            columns: ["besitzer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_ziele_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          aktiv: boolean
          archiviert_am: string | null
          email: string
          erstellt_am: string
          geaendert_am: string
          id: string
          name: string | null
          rolle: string
        }
        Insert: {
          aktiv?: boolean
          archiviert_am?: string | null
          email: string
          erstellt_am?: string
          geaendert_am?: string
          id: string
          name?: string | null
          rolle?: string
        }
        Update: {
          aktiv?: boolean
          archiviert_am?: string | null
          email?: string
          erstellt_am?: string
          geaendert_am?: string
          id?: string
          name?: string | null
          rolle?: string
        }
        Relationships: []
      }
      routine_haken: {
        Row: {
          archiviert_am: string | null
          datum: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          kategorie: string
          minuten: number
          punkt_id: string
        }
        Insert: {
          archiviert_am?: string | null
          datum: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kategorie: string
          minuten: number
          punkt_id: string
        }
        Update: {
          archiviert_am?: string | null
          datum?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kategorie?: string
          minuten?: number
          punkt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_haken_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_haken_punkt_id_fkey"
            columns: ["punkt_id"]
            isOneToOne: false
            referencedRelation: "routinepunkte"
            referencedColumns: ["id"]
          },
        ]
      }
      routinepunkte: {
        Row: {
          archiviert_am: string | null
          art: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          hinweis: string
          id: string
          kategorie: string
          minuten: number
          reihenfolge: number
          titel: string
          wochentag: number | null
        }
        Insert: {
          archiviert_am?: string | null
          art: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          hinweis?: string
          id?: string
          kategorie: string
          minuten?: number
          reihenfolge?: number
          titel: string
          wochentag?: number | null
        }
        Update: {
          archiviert_am?: string | null
          art?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          hinweis?: string
          id?: string
          kategorie?: string
          minuten?: number
          reihenfolge?: number
          titel?: string
          wochentag?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routinepunkte_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      sanierungsposten: {
        Row: {
          archiviert_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          firma: string | null
          geaendert_am: string
          geplant: number | null
          gewerk: string
          id: string
          notiz: string | null
          objekt_id: string
          status: string
          tatsaechlich: number | null
        }
        Insert: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma?: string | null
          geaendert_am?: string
          geplant?: number | null
          gewerk: string
          id?: string
          notiz?: string | null
          objekt_id: string
          status?: string
          tatsaechlich?: number | null
        }
        Update: {
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma?: string | null
          geaendert_am?: string
          geplant?: number | null
          gewerk?: string
          id?: string
          notiz?: string | null
          objekt_id?: string
          status?: string
          tatsaechlich?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sanierungsposten_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanierungsposten_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      sprintpunkte: {
        Row: {
          archiviert_am: string | null
          bereich: string
          besitzer_id: string
          bis: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          privat: boolean
          titel: string
          von: string
        }
        Insert: {
          archiviert_am?: string | null
          bereich: string
          besitzer_id?: string
          bis: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          privat?: boolean
          titel: string
          von: string
        }
        Update: {
          archiviert_am?: string | null
          bereich?: string
          besitzer_id?: string
          bis?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          privat?: boolean
          titel?: string
          von?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprintpunkte_besitzer_id_fkey"
            columns: ["besitzer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprintpunkte_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      tagesfokus: {
        Row: {
          archiviert_am: string | null
          besitzer_id: string
          datum: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          text: string
        }
        Insert: {
          archiviert_am?: string | null
          besitzer_id?: string
          datum: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          text?: string
        }
        Update: {
          archiviert_am?: string | null
          besitzer_id?: string
          datum?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "tagesfokus_besitzer_id_fkey"
            columns: ["besitzer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tagesfokus_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      uebergaben: {
        Row: {
          anwesende: string[]
          archiviert_am: string | null
          bemerkungen: string | null
          einheit_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          maengel: Json
          objekt_id: string
          pdf_name: string | null
          richtung: string
          schluessel: Json
        }
        Insert: {
          anwesende?: string[]
          archiviert_am?: string | null
          bemerkungen?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          maengel?: Json
          objekt_id: string
          pdf_name?: string | null
          richtung: string
          schluessel?: Json
        }
        Update: {
          anwesende?: string[]
          archiviert_am?: string | null
          bemerkungen?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          maengel?: Json
          objekt_id?: string
          pdf_name?: string | null
          richtung?: string
          schluessel?: Json
        }
        Relationships: [
          {
            foreignKeyName: "uebergaben_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uebergaben_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uebergaben_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      ummeldungen: {
        Row: {
          anbieter: string | null
          archiviert_am: string | null
          art: string
          bestaetigt_am: string | null
          einheit_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          gemeldet_am: string | null
          id: string
          notiz: string | null
          objekt_id: string
          richtung: string
          status: string
          zaehlernummer: string | null
          zaehlerstand: string | null
        }
        Insert: {
          anbieter?: string | null
          archiviert_am?: string | null
          art: string
          bestaetigt_am?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gemeldet_am?: string | null
          id?: string
          notiz?: string | null
          objekt_id: string
          richtung: string
          status?: string
          zaehlernummer?: string | null
          zaehlerstand?: string | null
        }
        Update: {
          anbieter?: string | null
          archiviert_am?: string | null
          art?: string
          bestaetigt_am?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gemeldet_am?: string | null
          id?: string
          notiz?: string | null
          objekt_id?: string
          richtung?: string
          status?: string
          zaehlernummer?: string | null
          zaehlerstand?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ummeldungen_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ummeldungen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ummeldungen_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      visionboard_kacheln: {
        Row: {
          archiviert_am: string | null
          besitzer_id: string
          bild_pfad: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          kategorie: string
          reihenfolge: number
          satz: string
        }
        Insert: {
          archiviert_am?: string | null
          besitzer_id?: string
          bild_pfad?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kategorie?: string
          reihenfolge?: number
          satz?: string
        }
        Update: {
          archiviert_am?: string | null
          besitzer_id?: string
          bild_pfad?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kategorie?: string
          reihenfolge?: number
          satz?: string
        }
        Relationships: [
          {
            foreignKeyName: "visionboard_kacheln_besitzer_id_fkey"
            columns: ["besitzer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visionboard_kacheln_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      weg_eigentuemer: {
        Row: {
          angabe_am: string | null
          anschrift: string | null
          archiviert_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          id: string
          kontakt_id: string | null
          kontakt_nicht_gewuenscht: boolean
          name: string
          objekt_id: string
          quelle: string | null
          we_nr: string | null
        }
        Insert: {
          angabe_am?: string | null
          anschrift?: string | null
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kontakt_id?: string | null
          kontakt_nicht_gewuenscht?: boolean
          name: string
          objekt_id: string
          quelle?: string | null
          we_nr?: string | null
        }
        Update: {
          angabe_am?: string | null
          anschrift?: string | null
          archiviert_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          id?: string
          kontakt_id?: string | null
          kontakt_nicht_gewuenscht?: boolean
          name?: string
          objekt_id?: string
          quelle?: string | null
          we_nr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weg_eigentuemer_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weg_eigentuemer_kontakt_id_fkey"
            columns: ["kontakt_id"]
            isOneToOne: false
            referencedRelation: "kontakte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weg_eigentuemer_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      zaehler: {
        Row: {
          archiviert_am: string | null
          art: string
          datum: string | null
          einheit_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          foto_name: string | null
          geaendert_am: string
          id: string
          malo_id: string | null
          nummer: string | null
          objekt_id: string
          richtung: string
          stand: string | null
        }
        Insert: {
          archiviert_am?: string | null
          art: string
          datum?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          foto_name?: string | null
          geaendert_am?: string
          id?: string
          malo_id?: string | null
          nummer?: string | null
          objekt_id: string
          richtung: string
          stand?: string | null
        }
        Update: {
          archiviert_am?: string | null
          art?: string
          datum?: string | null
          einheit_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          foto_name?: string | null
          geaendert_am?: string
          id?: string
          malo_id?: string | null
          nummer?: string | null
          objekt_id?: string
          richtung?: string
          stand?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zaehler_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zaehler_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zaehler_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
