import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildSite, projectDirectory } from '../scripts/build-site.mjs';
import { allArticles, siteOrigin } from '../lib/publication.mjs';
import config from '../config.json' with { type: 'json' };

test('static output releases full text only after each scheduled date and removes stale pages', async () => {
  const outputDirectory = path.join(projectDirectory, '.qa', 'boundaries');
  for (const [now, expected] of [['2026-10-16T13:00:00Z', 3], ['2026-10-12T12:59:59Z', 0], ['2026-10-12T13:00:00Z', 1], ['2026-10-14T13:00:00Z', 2]]) {
    const result = await buildSite({ now, outputDirectory });
    assert.equal(result.articles, expected);
    const rss = await fs.readFile(path.join(outputDirectory, 'rss.xml'), 'utf8');
    assert.equal((rss.match(/<item>/g) ?? []).length, expected);
    for (const article of allArticles) {
      const released = new Date(article.publishedAt) <= new Date(now);
      const filename = path.join(outputDirectory, 'articles', article.slug, 'index.html');
      if (released) assert.ok((await fs.readFile(filename, 'utf8')).includes(article.html));
      else await assert.rejects(fs.access(filename), { code: 'ENOENT' });
    }
    const home = await fs.readFile(path.join(outputDirectory, 'index.html'), 'utf8');
    const head = home.match(/<head>(.*?)<\/head>/s)[1];
    assert.ok(head.includes(`<meta name="zen-verification" content="${config.zenVerification}">`));
    assert.equal((home.match(/name="zen-verification"/g) ?? []).length, 1);
    assert.ok(home.includes(`href="${siteOrigin}/rss.xml"`));
    for (const article of allArticles) assert.ok(!home.includes(article.html));
    await assert.rejects(fs.access(path.join(outputDirectory, 'data', 'articles.json')), { code: 'ENOENT' });
    await fs.access(path.join(outputDirectory, 'covers', '01.png'));
    await fs.access(path.join(outputDirectory, '.nojekyll'));
  }
});

test('build refuses output paths outside its generated folders', async () => {
  await assert.rejects(buildSite({ outputDirectory: projectDirectory }), /Output must/);
  await assert.rejects(buildSite({ outputDirectory: path.join(projectDirectory, 'public') }), /Output must/);
});
