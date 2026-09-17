import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const hash = token => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');

export function openRepository(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);');
  if (!db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(new URL('./migrations/001_initial.sql', import.meta.url), 'utf8'));
      db.prepare('INSERT INTO schema_migrations(version) VALUES (1)').run();
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const repository = {
    close: () => db.close(),
    memberByToken(token) {
      return db.prepare('SELECT id, name FROM members WHERE token_hash = ?').get(hash(token));
    },
    listMembers() { return db.prepare('SELECT id, name FROM members ORDER BY name').all(); },
    addMember(name) {
      const id = randomUUID(), token = newToken();
      db.prepare('INSERT INTO members(id,name,token_hash) VALUES (?,?,?)').run(id, name, hash(token));
      return { id, name, token };
    },
    renewMember(id) {
      const token = newToken();
      const result = db.prepare('UPDATE members SET token_hash = ? WHERE id = ?').run(hash(token), id);
      return result.changes ? { token } : null;
    },
    addEvent(event) {
      const id = randomUUID();
      db.prepare('INSERT INTO events(id,kind,title,start,end,capacity) VALUES (?,?,?,?,?,?)').run(id, event.kind, event.title, event.start, event.end, event.capacity);
      return { id, ...event };
    },
    listEvents(memberId) {
      return db.prepare(`SELECT e.*, (SELECT COUNT(*) FROM responses r WHERE r.event_id = e.id AND r.answer = 'ja') AS confirmed,
        (SELECT answer FROM responses r WHERE r.event_id = e.id AND r.member_id = ?) AS my_answer
        FROM events e ORDER BY e.start`).all(memberId);
    },
    setAnswer(memberId, eventId, answer) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const event = db.prepare('SELECT capacity FROM events WHERE id = ?').get(eventId);
        if (!event) return rollbackResult('Eintrag nicht gefunden.', 404);
        const previous = db.prepare('SELECT answer FROM responses WHERE event_id = ? AND member_id = ?').get(eventId, memberId);
        const count = db.prepare("SELECT COUNT(*) AS total FROM responses WHERE event_id = ? AND answer = 'ja'").get(eventId).total;
        if (answer === 'ja' && previous?.answer !== 'ja' && count >= event.capacity) return rollbackResult('Dieser Eintrag ist ausgebucht.', 409);
        db.prepare('INSERT INTO responses(event_id,member_id,answer) VALUES (?,?,?) ON CONFLICT(event_id,member_id) DO UPDATE SET answer=excluded.answer').run(eventId, memberId, answer);
        db.exec('COMMIT');
        return { ok: true };
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      function rollbackResult(message, status) { db.exec('ROLLBACK'); return { error: message, status }; }
    },
  };
  return repository;
}
