# language: de
Funktionalität: Gruppenkalender
  Als Mitglied möchte ich Einträge sehen und meine Antwort einfach ändern können.

  Szenario: Admin erstellt eine Anfrage und lädt ein Mitglied ein
    Angenommen der Admin ist angemeldet
    Wenn er ein Mitglied und eine Anfrage mit zwei Plätzen anlegt
    Dann sieht das eingeladene Mitglied die Anfrage über seinen persönlichen Link

  Szenario: Zusage füllt einen begrenzten Eintrag
    Angenommen eine Anfrage hat einen Platz und zwei Mitglieder
    Wenn das erste Mitglied zusagt
    Dann kann das zweite Mitglied nicht ebenfalls zusagen
    Und eine Absage des ersten Mitglieds gibt den Platz wieder frei

  Szenario: Eigene Antwort ändern
    Angenommen ein Mitglied hat für einen Termin zugesagt
    Wenn es auf vielleicht oder nein wechselt
    Dann ersetzt die neue Antwort seine frühere Antwort

  Szenario: Persönlichen Link zurücksetzen
    Angenommen ein Mitglied hat einen Einladungslink
    Wenn der Admin den Link neu erzeugt
    Dann hat der alte Link keinen Zugriff mehr
