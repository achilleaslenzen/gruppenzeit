import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(value)); };
const safeEqual = (a,b) => { const left = Buffer.from(a), right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left,right); };

export function makeServer(calendar, repository, adminToken) {
  return createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET') return json(res,405,{error:'Methode nicht erlaubt.'});
      const path = url.pathname === '/' ? '/index.html' : url.pathname;
      const normalized = normalize(path).replace(/^[/\\]+/,'');
      if (!['index.html','app.js','style.css','manifest.json','sw.js','icon.svg'].includes(normalized)) return json(res,404,{error:'Nicht gefunden.'});
      try { res.writeHead(200,{'Content-Type':types[extname(normalized)],'Cache-Control':normalized === 'sw.js' ? 'no-cache' : 'public, max-age=300'}); res.end(readFileSync(join(publicDir,normalized))); }
      catch { json(res,404,{error:'Nicht gefunden.'}); }
      return;
    }
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '')?.[1] ?? '';
    const admin = Boolean(token) && safeEqual(token,adminToken);
    const member = admin ? null : token && repository.memberByToken(token);
    if (!admin && !member) return json(res,401,{error:'Einladungslink oder Admin-Schlüssel erforderlich.'});
    try {
      let body = {};
      if (['POST','PUT'].includes(req.method)) {
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 8192) return json(res,413,{error:'Anfrage zu groß.'}); }
        try { body = JSON.parse(raw); } catch { return json(res,400,{error:'Ungültiges JSON.'}); }
        if (typeof body !== 'object' || body === null || Array.isArray(body)) return json(res,400,{error:'Ungültige Eingabe.'});
      }
      if (req.method === 'GET' && url.pathname === '/api/me') return json(res,200,admin ? {role:'admin'} : {role:'member',name:member.name});
      if (req.method === 'GET' && url.pathname === '/api/events') return json(res,200,calendar.list(member ?? {id:''}));
      if (req.method === 'GET' && url.pathname === '/api/members' && admin) return json(res,200,calendar.members());
      if (req.method === 'POST' && url.pathname === '/api/members' && admin) return json(res,201,calendar.invite(body.name));
      const renew = /^\/api\/members\/([0-9a-f-]{36})\/renew$/.exec(url.pathname);
      if (req.method === 'POST' && renew && admin) { const result = calendar.renew(renew[1]); return json(res,result ? 200 : 404,result ?? {error:'Mitglied nicht gefunden.'}); }
      if (req.method === 'POST' && url.pathname === '/api/events' && admin) return json(res,201,calendar.create(body));
      const response = /^\/api\/events\/([0-9a-f-]{36})\/response$/.exec(url.pathname);
      if (req.method === 'PUT' && response && member) { const result = calendar.respond(member,response[1],body.answer); return json(res,result.status ?? 200,result); }
      return json(res,admin || member ? 404 : 403,{error:'Aktion nicht verfügbar.'});
    } catch (error) {
      if (error instanceof Error && /^(Bitte|Ungültige)/.test(error.message)) return json(res,400,{error:error.message});
      console.error('Anfrage fehlgeschlagen');
      return json(res,500,{error:'Interner Fehler.'});
    }
  });
}
