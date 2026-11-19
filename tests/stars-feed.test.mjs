import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed } from '../channels/zvezdy/build.mjs';

test('stars feed omits manually published articles and retains stable draft identifiers', () => {
  const sample = { slug: 'sample', title: 'Кино & герои', description: 'Описание', sourcePublishedAt: '2026-11-19T12:00:00+05:00', cover: '/zvezdy/covers/05.png', coverBytes: 1234, coverWidth: 1672, coverHeight: 941, html: '<p>Полный текст.</p>' };
  const articles = [{ ...sample, slug: 'already-published', alreadyPublishedOnDzen: true }, { ...sample, alreadyPublishedOnDzen: false }];
  const first = buildFeed(articles, '2026-11-19T10:00:00Z');
  const second = buildFeed(articles, '2026-11-20T10:00:00Z');
  assert.equal((first.match(/<item>/g) ?? []).length, 1);
  assert.ok(!first.includes('already-published'));
  assert.ok(first.includes('<category>native-draft</category>'));
  assert.ok(first.includes('<p>Полный текст.</p>'));
  assert.ok(first.includes('Кино &amp; герои'));
  assert.equal(first.match(/<guid[^>]*>.*?<\/guid>/)[0], second.match(/<guid[^>]*>.*?<\/guid>/)[0]);
});

