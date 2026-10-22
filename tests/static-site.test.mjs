import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildSite, projectDirectory } from '../scripts/build-site.mjs';
import { allArticles, sourcePublishedAt, siteOrigin } from '../lib/publication.mjs';
import config from '../config.json' with { type: 'json' };

test('all ten source pages exist for initial RSS review, independently of Dzen schedule', async () => {
  const outputDirectory = path.join(projectDirectory, '.qa', 'boundaries');
  for (const [now, expected] of [['2026-10-15T13:00:00Z', 10], ['2026-10-12T12:59:59Z', 0], ['2026-10-14T13:00:00Z', 2]]) {
    const result = await buildSite({ now, outputDirectory });
    assert.equal(result.articles, expected);
    const rss = await fs.readFile(path.join(outputDirectory, 'rss.xml'), 'utf8');
    const sitemap = await fs.readFile(path.join(outputDirectory, 'sitemap.xml'), 'utf8');
    assert.equal((rss.match(/<item>/g) ?? []).length, expected);
    for (const article of allArticles) {
      const released = new Date(sourcePublishedAt(article)) <= new Date(now);
      const filename = path.join(outputDirectory, 'articles', article.slug, 'index.html');
      if (released) {
        const page = await fs.readFile(filename, 'utf8');
        assert.ok(page.includes(article.html));
        assert.ok(page.includes('datetime="' + sourcePublishedAt(article) + '"'));
        assert.ok(sitemap.includes('/articles/' + article.slug + '/'));
      } else {
        await assert.rejects(fs.access(filename), { code: 'ENOENT' });
        assert.ok(!sitemap.includes('/articles/' + article.slug + '/'));
      }
    }
    const home = await fs.readFile(path.join(outputDirectory, 'index.html'), 'utf8');
    const head = home.match(/<head>(.*?)<\/head>/s)[1];
    assert.ok(head.includes('<meta name="zen-verification" content="' + config.zenVerification + '">'));
    assert.equal((home.match(/name="zen-verification"/g) ?? []).length, 1);
    assert.ok(home.includes('href="' + siteOrigin + '/rss.xml"'));
    assert.ok(home.includes('Первая серия · ' + allArticles.length + ' статей'));
    assert.ok(home.includes('class="number">10</span>'));
    for (const article of allArticles) assert.ok(!home.includes(article.html));
    await assert.rejects(fs.access(path.join(outputDirectory, 'data', 'articles.json')), { code: 'ENOENT' });
    await fs.access(path.join(outputDirectory, 'covers', '10-v2.png'));
    await fs.access(path.join(outputDirectory, '.nojekyll'));
  }
});

test('build refuses output paths outside its generated folders', async () => {
  await assert.rejects(buildSite({ outputDirectory: projectDirectory }), /Output must/);
  await assert.rejects(buildSite({ outputDirectory: path.join(projectDirectory, 'public') }), /Output must/);
});
