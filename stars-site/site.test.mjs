import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildSite, buildFeed, siteOrigin } from './build.mjs';
import config from './config.json' with { type: 'json' };

test('independent site uses its own domain, verification and assets; published articles stay out of RSS', async () => {
  await buildSite();
  const articles = JSON.parse(await fs.readFile(new URL('./articles.json', import.meta.url), 'utf8'));
  const directory = new URL('./dist/', import.meta.url);
  const home = await fs.readFile(new URL('index.html', directory), 'utf8');
  const head = home.match(/<head>(.*?)<\/head>/s)[1];
  assert.equal((head.match(/name="zen-verification"/g) ?? []).length, 1);
  assert.ok(head.includes(`content="${config.zenVerification}"`));
  const feed = await fs.readFile(new URL('rss.xml', directory), 'utf8');
  assert.equal((feed.match(/<item>/g) ?? []).length, 2);
  assert.equal(articles.filter(a => a.alreadyPublishedOnDzen).length, 4);
  const later = buildFeed(articles, '2026-12-01T10:00:00Z');
  assert.deepEqual([...feed.matchAll(/<guid[^>]*>(.*?)<\/guid>/g)].map(m => m[1]), [...later.matchAll(/<guid[^>]*>(.*?)<\/guid>/g)].map(m => m[1]));
  for (const article of articles) {
    assert.equal(feed.includes(`${siteOrigin}/articles/${article.slug}/`), !article.alreadyPublishedOnDzen);
    const page = await fs.readFile(new URL(`articles/${article.slug}/index.html`, directory), 'utf8');
    for (const content of [home, feed, page]) {
      assert.ok(!content.includes('mkdigitaly-pixel.github.io'));
      assert.ok(!content.includes('chatgpt.site'));
      assert.ok(!content.includes('/zvezdy/'));
    }
    const cover = await fs.stat(new URL(article.cover.slice(1), directory));
    assert.equal(cover.size, article.coverBytes);
    for (const [, image] of page.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      const url = new URL(image, siteOrigin);
      assert.equal(url.origin, siteOrigin);
      await fs.access(new URL(url.pathname.slice(1), directory));
    }
  }
  assert.ok(feed.includes('<category>native-draft</category>'));
  assert.ok(home.includes(`href="${siteOrigin}/rss.xml"`));
});

