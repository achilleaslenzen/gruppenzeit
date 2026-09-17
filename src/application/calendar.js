import { validateAnswer, validateEvent } from '../domain/rules.js';

export function createCalendar(repository) {
  return {
    list: member => repository.listEvents(member.id),
    members: () => repository.listMembers(),
    invite: name => {
      const clean = String(name ?? '').trim();
      if (!clean || clean.length > 80) throw new Error('Bitte einen Namen mit höchstens 80 Zeichen eingeben.');
      return repository.addMember(clean);
    },
    renew: id => repository.renewMember(id),
    create: input => repository.addEvent(validateEvent(input)),
    respond: (member, eventId, answer) => repository.setAnswer(member.id, eventId, validateAnswer(answer)),
  };
}
