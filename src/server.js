import { openRepository } from './infrastructure/sqlite.js';
import { createCalendar } from './application/calendar.js';
import { makeServer } from './transport/http.js';

const adminToken = process.env.ADMIN_TOKEN;
if (!adminToken || adminToken.length < 32) { console.error('ADMIN_TOKEN mit mindestens 32 Zeichen setzen.'); process.exit(1); }
const repository = openRepository(process.env.DATA_FILE ?? './data/gruppenzeit.sqlite');
const server = makeServer(createCalendar(repository), repository, adminToken);
server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '127.0.0.1', () => console.log('Gruppenzeit läuft.'));
const shutdown = () => server.close(() => { repository.close(); process.exit(0); });
process.on('SIGINT',shutdown); process.on('SIGTERM',shutdown);
