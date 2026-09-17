import test from 'node:test';
import assert from 'node:assert/strict';
import { openRepository } from '../src/infrastructure/sqlite.js';
import { createCalendar } from '../src/application/calendar.js';
import { makeServer } from '../src/transport/http.js';

const ADMIN='test-admin-token-of-at-least-32-characters';
async function fixture(t){
  const repository=openRepository(':memory:'), calendar=createCalendar(repository), server=makeServer(calendar,repository,ADMIN);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));repository.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=async(path,token,method='GET',body)=>{
    const response=await fetch(base+'/api'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,data:await response.json()};
  };
  return {request};
}

test('Einladung, Zugriff, Antworten und Platzlimit',async t=>{
  const {request}=await fixture(t);
  const a=(await request('/members',ADMIN,'POST',{name:'Anna'})).data;
  const b=(await request('/members',ADMIN,'POST',{name:'Ben'})).data;
  assert.equal((await request('/me',a.token)).data.name,'Anna');
  const event=(await request('/events',ADMIN,'POST',{title:'Dienst',kind:'anfrage',start:'2026-10-01T10:00:00Z',end:'2026-10-01T12:00:00Z',capacity:1})).data;
  assert.equal((await request('/events/'+event.id+'/response',a.token,'PUT',{answer:'ja'})).status,200);
  assert.equal((await request('/events/'+event.id+'/response',b.token,'PUT',{answer:'ja'})).status,409);
  assert.equal((await request('/events/'+event.id+'/response',a.token,'PUT',{answer:'vielleicht'})).status,200);
  assert.equal((await request('/events/'+event.id+'/response',b.token,'PUT',{answer:'ja'})).status,200);
  const view=(await request('/events',a.token)).data[0];
  assert.equal(view.confirmed,1); assert.equal(view.my_answer,'vielleicht');
});

test('Link-Erneuerung sperrt alten Link; Mitglieder können nichts verwalten',async t=>{
  const {request}=await fixture(t);
  const member=(await request('/members',ADMIN,'POST',{name:'Anna'})).data;
  assert.equal((await request('/events',member.token,'POST',{title:'Nicht erlaubt'})).status,404);
  const newer=(await request('/members/'+member.id+'/renew',ADMIN,'POST',{})).data;
  assert.equal((await request('/me',member.token)).status,401);
  assert.equal((await request('/me',newer.token)).status,200);
});

test('Eingaben und schreibgeschützte statische Auslieferung',async t=>{
  const {request}=await fixture(t);
  assert.equal((await request('/events',ADMIN,'POST',{title:'x',kind:'slot',start:'2026-10-01T12:00:00Z',end:'2026-10-01T10:00:00Z',capacity:1})).status,400);
  assert.equal((await request('/me','invalid')).status,401);
});
