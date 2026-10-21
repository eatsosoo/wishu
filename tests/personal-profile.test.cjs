const assert = require('node:assert/strict');
const { test } = require('node:test');
const { database, users } = require('./helpers/relational-db.cjs');
const { getCalendarEvents } = require('../src/features/calendar/holidays.ts');

test('profile updates persist only for the verified member and synchronize to the partner', async t => {
  const h = await database();
  t.after(() => h.db.close());
  await h.command(users[1], { kind: 'personalProfile', input: { birthDate: '2000-02-14', gender: 'female', actor: 'minh' } });
  const owner = (await h.state(users[1])).snapshot.couple.members.find(member => member.id === 'linh');
  const partnerView = (await h.state(users[0])).snapshot.couple.members;
  assert.equal(owner.birthDate, '2000-02-14');
  assert.equal(owner.gender, 'female');
  assert.deepEqual(partnerView.find(member => member.id === 'linh'), owner);
  assert.equal(partnerView.find(member => member.id === 'minh').birthDate, undefined);
  const birthdays = getCalendarEvents(2, 14, partnerView);
  assert.deepEqual(birthdays.map(event => event.icon), ['heart', 'birthday']);
  await h.command(users[1], { kind: 'personalProfile', input: { birthDate: null, gender: 'other' } });
  const cleared = (await h.state(users[0])).snapshot.couple.members.find(member => member.id === 'linh');
  assert.equal(cleared.birthDate, undefined);
  assert.equal(cleared.gender, 'other');
  assert.deepEqual(getCalendarEvents(2, 14, [cleared]).map(event => event.icon), ['heart']);
});

test('invalid profile fields roll back and profile writes require the service command', async t => {
  const h = await database();
  t.after(() => h.db.close());
  const input = { birthDate: '1998-10-20', gender: 'male' };
  await h.command(users[0], { kind: 'personalProfile', input });
  for (const invalid of [
    { ...input, birthDate: '2026-02-30' },
    { ...input, birthDate: '2999-01-01' },
    { ...input, birthDate: '1899-01-01' },
    { ...input, birthDate: '' },
    { ...input, gender: 'invalid' },
    { ...input, gender: 12 },
    { gender: 'male' },
  ]) await assert.rejects(h.command(users[0], { kind: 'personalProfile', input: invalid }));
  const state = (await h.state(users[0])).snapshot.couple.members.find(member => member.id === 'minh');
  assert.equal(state.birthDate, input.birthDate);
  assert.equal(state.gender, input.gender);
  await assert.rejects(h.command(users[2], { kind: 'personalProfile', input }));
  await assert.rejects(h.asUser(users[0], () => h.db.exec("update wish_members set gender='female'")), /permission denied/);
});

test('calendar keeps annual holidays and birthdays separate, including leap birthdays', () => {
  assert.equal(getCalendarEvents(2, 14)[0].name, 'Valentine Đỏ');
  assert.equal(getCalendarEvents(2, 14)[0].icon, 'heart');
  assert.equal(getCalendarEvents(3, 14)[0].name, 'Valentine Trắng');
  assert.equal(getCalendarEvents(3, 14)[0].icon, 'whiteHeart');
  assert.equal(getCalendarEvents(3, 8)[0].icon, 'flower');
  assert.equal(getCalendarEvents(10, 20)[0].icon, 'bouquet');
  assert.equal(getCalendarEvents(6, 1)[0].name, 'Ngày Quốc tế Thiếu nhi');
  assert.equal(getCalendarEvents(6, 1)[0].icon, 'balloons');
  assert.equal(getCalendarEvents(11, 19)[0].icon, 'moustache');
  assert.equal(getCalendarEvents(12, 25)[0].icon, 'tree');
  assert.deepEqual(getCalendarEvents(4, 15), []);
  const partner = { name: 'Linh', birthDate: '2000-02-29' };
  assert.equal(getCalendarEvents(2, 29, [partner])[0].name, 'Sinh nhật Linh');
  assert.deepEqual(getCalendarEvents(2, 28, [partner]), []);
  assert.deepEqual(getCalendarEvents(3, 29, [partner]), []);
});
