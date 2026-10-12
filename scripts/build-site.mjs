import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedArticles, articleUrl, buildRss, siteOrigin, xmlEscape } from '../lib/publication.mjs';
import { renderHome, renderArticle, layout } from './render.mjs';

export const projectDirectory = fileURLToPath(new URL('..', import.meta.url));
export async function buildSite({ now = new Date(), outputDirectory = path.join(projectDirectory, 'dist') } = {}) {
  const output = path.resolve(outputDirectory);
  const root = path.resolve(projectDirectory);
  const defaultOutput = path.join(root, 'dist');
  const qaOutput = path.dirname(output) === path.join(root, '.qa') && /^[a-z0-9-]+$/.test(path.basename(output));
  if (output !== defaultOutput && !qaOutput) throw new Error('Output must be dist or a named project-local .qa directory');
  const marker = path.join(output, '.site-generated');
  try {
    await fs.access(output);
    await fs.access(marker);
    await fs.rm(output, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // An existing directory without our marker must never be overwritten.
    try { await fs.access(output); throw new Error('Refusing to overwrite an unmarked output directory'); }
    catch (missing) { if (missing.code !== 'ENOENT') throw missing; }
  }
  const articles = publishedArticles(now);
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(marker, 'Generated publication output\n');
  await fs.cp(path.join(root, 'public'), output, { recursive: true });
  await fs.writeFile(path.join(output, '.nojekyll'), '');
  await fs.writeFile(path.join(output, 'index.html'), renderHome(now));
  await fs.writeFile(path.join(output, 'rss.xml'), buildRss(now));
  await fs.writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`);
  await fs.writeFile(path.join(output, '404.html'), layout('<section class="empty"><p class="eyebrow">ЗНАЕТЕ ЛИ ВЫ ЧТО</p><h1>Страница пока недоступна</h1><p>Материалы появляются здесь после выхода. <a href="/">Вернуться на главную →</a></p></section>', { title: 'Страница пока недоступна' }));
  const urls = [siteOrigin + '/', ...articles.map(articleUrl)];
  await fs.writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${xmlEscape(url)}</loc></url>`).join('')}</urlset>\n`);
  for (const article of articles) {
    if (!/^[a-z0-9-]+$/.test(article.slug)) throw new Error('Invalid article slug');
    const directory = path.join(output, 'articles', article.slug);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'index.html'), renderArticle(article));
  }
  return { outputDirectory: output, articles: articles.length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await buildSite()));
}
