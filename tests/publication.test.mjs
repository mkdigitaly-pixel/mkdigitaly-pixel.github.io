import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishedArticles, getPublishedArticle, buildRss, cdata, xmlEscape, siteOrigin } from '../lib/publication.mjs';
test('release boundaries use the schedule in Yekaterinburg', () => {
  for (const [time, count] of [['2026-10-12T12:59:59Z', 0], ['2026-10-12T13:00:00Z', 1], ['2026-10-14T12:59:59Z', 1], ['2026-10-14T13:00:00Z', 2], ['2026-10-16T13:00:00Z', 3]]) assert.equal(publishedArticles(time).length, count, time);
  assert.equal(getPublishedArticle('tri-zadachi', '2026-10-12T12:59:59Z'), undefined);
  assert.equal(getPublishedArticle('beskonechnye-devyatki', '2026-10-14T13:00:00Z'), undefined);
});
test('feed excludes future full text and has stable canonical identifiers', () => {
  const before = buildRss('2026-10-12T12:59:59Z'), first = buildRss('2026-10-12T13:00:00Z'), later = buildRss('2026-10-14T13:00:00Z');
  assert.equal((before.match(/<item>/g) ?? []).length, 0); assert.equal((first.match(/<item>/g) ?? []).length, 1); assert.equal((later.match(/<item>/g) ?? []).length, 2);
  assert.ok(first.includes('Блокнот и ручка вместе стоят 140 рублей')); assert.ok(!first.includes('/articles/skidka-i-povyshenie'));
  const guid = `<guid isPermaLink="true">${siteOrigin}/articles/tri-zadachi/</guid>`;
  assert.ok(first.includes(guid) && later.includes(guid)); assert.ok(first.includes('Mon, 12 Oct 2026 13:00:00 GMT')); assert.ok(first.includes(`src="${siteOrigin}/covers/01.png"`));
  assert.match(first, /<enclosure url="https:\/\/[^" ]+" length="\d+" type="image\/png"/); assert.equal(buildRss('2026-10-12T13:00:00Z'), first);
});
test('XML escapes text and safely splits CDATA terminators', () => { assert.equal(xmlEscape('A&B <tag> "yes"'), 'A&amp;B &lt;tag&gt; &quot;yes&quot;'); assert.equal(cdata('one]]>two'), '<![CDATA[one]]]]><![CDATA[>two]]>'); });

