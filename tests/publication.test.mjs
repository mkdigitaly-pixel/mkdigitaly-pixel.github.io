import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { publishedArticles, siteArticles, sourcePublishedAt, buildRss, cdata, xmlEscape, siteOrigin, allArticles, articleUrl } from '../lib/publication.mjs';

const available = '2026-10-15T13:00:00Z';
const initialArticles = allArticles.filter(a => /^p(?:0[1-9]|10)$/.test(a.id));
test('source pages are available before their original planned Dzen dates', () => {
  assert.equal(siteArticles('2026-10-12T12:59:59Z').length, 0);
  assert.equal(siteArticles('2026-10-14T13:00:00Z').length, 2);
  assert.equal(siteArticles(available).length, 10);
  assert.equal(publishedArticles(available).length, 2);
  assert.equal(publishedArticles('2026-10-16T12:59:59Z').length, 2);
  assert.equal(publishedArticles('2026-10-16T13:00:00Z').length, 3);
  assert.equal(publishedArticles('2026-10-28T13:00:00Z').filter(a => initialArticles.includes(a)).length, 10);
  assert.ok(initialArticles.every(a => new Date(sourcePublishedAt(a)) <= new Date(available)));
});
test('initial feed contains ten full materials with stable GUIDs and original Dzen dates', () => {
  const rss = buildRss(available);
  assert.equal((rss.match(/<item>/g) ?? []).length, 10);
  assert.equal((rss.match(/<category>format-article<\/category>/g) ?? []).length, 10);
  assert.ok(!rss.includes('native-draft'));
  assert.ok(!rss.includes('<author>'));
  for (const article of initialArticles) {
    const url = articleUrl(article);
    assert.ok(rss.includes('<guid isPermaLink="true">' + url + '</guid>'));
    assert.ok(rss.includes('<pubDate>' + new Date(article.publishedAt).toUTCString() + '</pubDate>'));
    assert.ok(rss.includes(article.html));
    assert.ok(rss.includes('src="' + siteOrigin + article.cover + '"'));
    assert.ok(!new URL(url).search);
    assert.equal(new URL(url).pathname, '/articles/' + article.slug + '/');
  }
  const originalDates = ['2026-10-12T18:00:00+05:00','2026-10-14T18:00:00+05:00','2026-10-16T18:00:00+05:00'];
  assert.deepEqual(allArticles.slice(0, 3).map(a => a.publishedAt), originalDates);
  assert.ok(rss.includes('Wed, 28 Oct 2026 13:00:00 GMT'));
});
test('article bodies use documented Dzen HTML and real PNG covers at least 700 pixels wide', async () => {
  const supported = new Set(['p','a','b','i','u','s','h1','h2','h3','h4','blockquote','ul','ol','li','figure','img','figcaption','video','source']);
  assert.equal(new Set(allArticles.map(articleUrl)).size, allArticles.length);
  for (const article of allArticles) {
    assert.ok(article.html.replace(/<[^>]*>/g, '').length >= 300, article.id);
    for (const tag of article.html.matchAll(/<\/?([a-z][a-z0-9]*)\b/gi)) assert.ok(supported.has(tag[1].toLowerCase()), article.id + ': ' + tag[1]);
    assert.doesNotMatch(article.html, /<p>\s*<(?:ul|ol)>/);
    const cover = await fs.readFile(new URL('../public' + article.cover, import.meta.url));
    assert.equal(cover.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(cover.length, article.coverBytes, article.id + ' cover bytes');
    assert.equal(cover.readUInt32BE(16), article.coverWidth);
    assert.equal(cover.readUInt32BE(20), article.coverHeight);
    assert.ok(article.coverWidth >= 700);
  }
});
test('XML escapes text and safely splits CDATA terminators', () => {
  assert.equal(xmlEscape('A&B <tag> "yes"'), 'A&amp;B &lt;tag&gt; &quot;yes&quot;');
  assert.equal(cdata('one]]>two'), '<![CDATA[one]]]]><![CDATA[>two]]>');
});

test('the complete prepared feed includes new materials and future dates respect three daily release slots', () => {
 const latestSource = new Date(Math.max(...allArticles.map(a => new Date(sourcePublishedAt(a)).getTime())) + 1);
 const rss = buildRss(latestSource);
 assert.equal((rss.match(/<item>/g) ?? []).length, allArticles.length);
 const days = new Map();
 for (const a of allArticles.filter(a => a.publishedAt >= '2026-10-23')) {
  const local = new Date(new Date(a.publishedAt).getTime() + 5 * 3600000).toISOString();
  const key = local.slice(0,10), values=days.get(key)??[];
  values.push(new Date(a.publishedAt).getTime());days.set(key,values);
  assert.ok(['12:00','15:00','18:00'].includes(local.slice(11,16)),a.id);
  assert.ok(rss.includes('<pubDate>'+new Date(a.publishedAt).toUTCString()+'</pubDate>'));
 }
 for (const [day, values] of days) {
  assert.ok(values.length<=3,day);
  values.sort((a,b)=>a-b);
  for(let i=1;i<values.length;i++)assert.ok(values[i]-values[i-1]>=3*3600000,day);
 }
});
