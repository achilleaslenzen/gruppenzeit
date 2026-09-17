CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE);
CREATE TABLE events (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('termin','anfrage','slot')), title TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity > 0));
CREATE TABLE responses (event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE, answer TEXT NOT NULL CHECK(answer IN ('ja','vielleicht','nein')), PRIMARY KEY(event_id, member_id));
CREATE INDEX idx_events_start ON events(start);
