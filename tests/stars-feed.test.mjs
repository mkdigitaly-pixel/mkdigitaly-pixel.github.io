import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildFeed, rssArticles } from '../channels/zvezdy/build.mjs';
import articles from '../channels/zvezdy/articles.json' with { type: 'json' };
import config from '../channels/zvezdy/config.json' with { type: 'json' };

test('stars feed omits manually published articles and retains stable draft identifiers', () => {
  const sample = { slug: 'sample', title: 'Кино & герои', description: 'Описание', sourcePublishedAt: '2026-11-19T12:00:00+05:00', cover: '/zvezdy/covers/05.png', coverBytes: 1234, coverWidth: 1672, coverHeight: 941, html: '<p>Полный текст.</p>' };
  const articles = [{ ...sample, slug: 'already-published', alreadyPublishedOnDzen: true }, { ...sample, slug: 'previously-submitted', rssEnabled: false }, { ...sample, alreadyPublishedOnDzen: false }];
  const first = buildFeed(articles, '2026-11-19T10:00:00Z');
  const second = buildFeed(articles, '2026-11-20T10:00:00Z');
  assert.equal((first.match(/<item>/g) ?? []).length, 1);
  assert.ok(!first.includes('already-published'));
  assert.ok(!first.includes('previously-submitted'));
  assert.ok(first.includes('<category>native-draft</category>'));
  assert.ok(first.includes('<p>Полный текст.</p>'));
  assert.ok(first.includes('Кино &amp; герои'));
  assert.equal(first.match(/<guid[^>]*>.*?<\/guid>/)[0], second.match(/<guid[^>]*>.*?<\/guid>/)[0]);
  assert.equal(first.match(/<pubDate>.*?<\/pubDate>/)[0], second.match(/<pubDate>.*?<\/pubDate>/)[0]);
});

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  for (let offset = 2; offset < bytes.length;) {
    assert.equal(bytes[offset], 0xff);
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    offset += length;
  }
  throw new Error('JPEG dimensions not found');
}

test('initial stars review has ten distinct full articles with actual images at least 700px wide', async () => {
  const visible = rssArticles(articles);
  assert.ok(visible.length >= config.initialReviewMinimumItems);
  assert.equal(new Set(visible.map(a => a.slug)).size, visible.length);
  assert.equal(articles.filter(a => a.alreadyPublishedOnDzen).length, 4);
  for (const article of articles.slice(0, 6)) assert.equal(article.sourcePublishedAt, '2026-11-19T12:00:00+05:00');
  for (const article of visible) {
    assert.ok(!/^zvezdy-0[1-6]$/.test(article.id));
    assert.ok(article.coverCaption.includes('Сгенерированная'));
    assert.ok(article.html.includes('<figcaption>'));
    const publicText = article.title + article.description + article.html;
    assert.ok(!/(?:тайн|слух|интриг|[ёЁ])/i.test(publicText));
    const imagePaths = [article.cover, ...Array.from(article.html.matchAll(/<img src="https:\/\/mkdigitaly-pixel\.github\.io([^"]+)"/g), m => m[1])];
    assert.ok(imagePaths.length >= 2);
    for (const [index, imagePath] of imagePaths.entries()) {
      const bytes = await fs.readFile(new URL('../public' + imagePath, import.meta.url));
      const dimensions = jpegDimensions(bytes);
      assert.ok(dimensions.width >= 700, `${article.id}: ${imagePath}`);
      if (index === 0) {
        assert.equal(bytes.length, article.coverBytes);
        assert.equal(dimensions.width, article.coverWidth);
        assert.equal(dimensions.height, article.coverHeight);
      }
    }
  }
});
