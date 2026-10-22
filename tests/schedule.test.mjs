import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateReleaseSlots } from '../lib/schedule.mjs';
test('an existing 18:00 release counts toward three per day and new releases remain three hours apart', () => {
 const existing=[{publishedAt:'2026-10-23T18:00:00+05:00'}];
 assert.deepEqual(allocateReleaseSlots(existing,{now:'2026-10-22T14:00:00+05:00'}),[
 '2026-10-23T12:00:00+05:00','2026-10-23T15:00:00+05:00','2026-10-24T12:00:00+05:00']);
});
test('late preparation skips dates less than an hour ahead and protects off-grid existing releases', () => {
 assert.deepEqual(allocateReleaseSlots([],{now:'2026-10-23T14:30:00+05:00',count:1}),['2026-10-23T18:00:00+05:00']);
 assert.deepEqual(allocateReleaseSlots([{publishedAt:'2026-10-23T14:00:00+05:00'}],{now:'2026-10-22T14:00:00+05:00',count:1}),['2026-10-23T18:00:00+05:00']);
});

