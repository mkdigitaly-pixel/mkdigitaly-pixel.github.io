import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { xmlEscape, cdata } from '../../lib/publication.mjs';
import config from './config.json' with { type: 'json' };

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const basePath = config.basePath;
const origin = config.origin;
const channelUrl = `${origin}${basePath}/`;
const title = 'Звезды крупным планом';
const description = 'Истории советского кино и новости российского шоу-бизнеса.';

function layout(body, { pageTitle = title, canonical = channelUrl, image } = {}) {
  const verification = canonical === channelUrl ? `<meta name="zen-verification" content="${xmlEscape(config.zenVerification)}">` : '';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">${verification}<meta name="viewport" content="width=device-width,initial-scale=1"><title>${xmlEscape(pageTitle)}</title><meta name="description" content="${xmlEscape(description)}"><link rel="canonical" href="${canonical}"><link rel="alternate" type="application/rss+xml" title="${title}" href="${channelUrl}rss.xml"><link rel="stylesheet" href="${basePath}/style.css">${image ? `<meta property="og:image" content="${origin}${image}">` : ''}</head><body><header><a class="brand" href="${basePath}/"><img src="${basePath}/avatar.jpg" alt="" width="52" height="52"><span>${title}</span></a><a href="${basePath}/rss.xml">RSS</a></header><main>${body}</main><footer>${title} · <a href="${basePath}/rss.xml">RSS-лента</a></footer></body></html>\n`;
}

export function buildFeed(articles, now = new Date()) {
  const visible = articles.filter(article => !article.alreadyPublishedOnDzen);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${title}</title><link>${channelUrl}</link><description>${description}</description><language>ru</language><ttl>60</ttl><lastBuildDate>${new Date(now).toUTCString()}</lastBuildDate><atom:link href="${channelUrl}rss.xml" rel="self" type="application/rss+xml"/>
${visible.map(article => {
    const url = `${channelUrl}articles/${article.slug}/`;
    const cover = `${origin}${article.cover}`;
    const content = `<figure><img src="${cover}" alt="${xmlEscape(article.title)}" width="${article.coverWidth}" height="${article.coverHeight}"/></figure>${article.html}`;
    const coverType = article.coverType ?? 'image/png';
    return `<item><title>${xmlEscape(article.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(article.sourcePublishedAt).toUTCString()}</pubDate><category>Советское кино</category><category>format-article</category><category>native-draft</category><description>${xmlEscape(article.description)}</description><content:encoded>${cdata(content)}</content:encoded><enclosure url="${cover}" type="${coverType}" length="${article.coverBytes}"/><media:content url="${cover}" type="${coverType}" medium="image" width="${article.coverWidth}" height="${article.coverHeight}"/></item>`;
  }).join('\n')}
</channel></rss>\n`;
}

export async function buildStars(outputDirectory, now = new Date()) {
  const articles = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'articles.json'), 'utf8'));
  const output = path.join(outputDirectory, 'zvezdy');
  await fs.mkdir(output, { recursive: true });
  if (!/^[A-Za-z0-9]+$/.test(config.zenVerification)) throw new Error('Invalid stars verification token');
  const verificationFile = 'zen_' + config.zenVerification + '.html';
  const verificationHtml = '<meta name="zen-verification" content="' + xmlEscape(config.zenVerification) + '" />\n';
  await fs.writeFile(path.join(outputDirectory, verificationFile), verificationHtml);
  await fs.writeFile(path.join(output, verificationFile), verificationHtml);
  const cards = articles.map(article => `<article class="card"><a href="${basePath}/articles/${article.slug}/"><img src="${article.cover}" alt="" width="${article.coverWidth}" height="${article.coverHeight}"><h2>${xmlEscape(article.title)}</h2></a><p>${xmlEscape(article.description)}</p></article>`).join('');
  await fs.writeFile(path.join(output, 'index.html'), layout(`<h1>${title}</h1><p class="intro">${description}</p><section class="grid">${cards}</section>`));
  await fs.writeFile(path.join(output, 'rss.xml'), buildFeed(articles, now));
  const urls = [channelUrl];
  for (const article of articles) {
    if (!/^[a-z0-9-]+$/.test(article.slug)) throw new Error('Invalid stars article slug');
    const url = `${channelUrl}articles/${article.slug}/`;
    const directory = path.join(output, 'articles', article.slug);
    await fs.mkdir(directory, { recursive: true });
    const body = `<article class="reading"><a href="${basePath}/">Все статьи</a><h1>${xmlEscape(article.title)}</h1><p class="intro">${xmlEscape(article.description)}</p><img class="cover" src="${article.cover}" alt="${xmlEscape(article.title)}" width="${article.coverWidth}" height="${article.coverHeight}">${article.html}</article>`;
    await fs.writeFile(path.join(directory, 'index.html'), layout(body, { pageTitle: `${article.title} — ${title}`, canonical: url, image: article.cover }));
    urls.push(url);
  }
  await fs.writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${xmlEscape(url)}</loc></url>`).join('')}</urlset>\n`);
  return { articles: articles.length, feedItems: articles.filter(article => !article.alreadyPublishedOnDzen).length };
}

