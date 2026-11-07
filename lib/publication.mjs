import articles from '../data/articles.json' with { type: 'json' };
export const siteOrigin = 'https://mkdigitaly-pixel.github.io';
export const siteTitle = 'Знаете ли вы что';
export const siteDescription = 'Задачи на внимательность, математика в жизни и понятные объяснения удивительных вещей.';
export const allArticles = articles;
export function sourcePublishedAt(article) { return article.sitePublishedAt ?? article.publishedAt; }
export function siteArticles(now = new Date()) {
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new TypeError('Invalid publication time');
  return articles.filter(a => new Date(sourcePublishedAt(a)).getTime() <= timestamp)
    .sort((a, b) => new Date(sourcePublishedAt(b)) - new Date(sourcePublishedAt(a)) || a.id.localeCompare(b.id));
}
// These are elapsed planned Dzen dates, not confirmation of an actual Dzen import.
export function publishedArticles(now = new Date()) {
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new TypeError('Invalid publication time');
  return articles.filter(a => new Date(a.publishedAt).getTime() <= timestamp).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}
export function articleUrl(article) { return `${siteOrigin}/articles/${article.slug}/`; }
export function getPublishedArticle(slug, now = new Date()) { return publishedArticles(now).find(article => article.slug === slug); }
export function displayDate(value) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Asia/Yekaterinburg' }).format(new Date(value)); }
export function xmlEscape(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]); }
export function cdata(value) { return '<![CDATA[' + String(value).replaceAll(']]>', ']]]]><![CDATA[>') + ']]>'; }
export function buildRss(now = new Date()) {
  // Dzen needs all initial materials and their source pages before scheduled import.
  const visible = siteArticles(now);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xmlEscape(siteTitle)}</title><link>${siteOrigin}/</link><description>${xmlEscape(siteDescription)}</description><language>ru</language>
<lastBuildDate>${new Date(now).toUTCString()}</lastBuildDate><ttl>5</ttl>
<atom:link href="${siteOrigin}/rss.xml" rel="self" type="application/rss+xml" />
${visible.map(article => {
    const url = articleUrl(article), cover = siteOrigin + article.cover;
    const width = article.coverWidth ?? 1200, height = article.coverHeight ?? 675;
    const html = `<figure><img src="${cover}" alt="${xmlEscape(article.title)}" width="${width}" height="${height}" /></figure>${article.html}`;
    return `<item>
<title>${xmlEscape(article.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid>
<pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate><category>format-article</category>
<description>${xmlEscape(article.description)}</description><content:encoded>${cdata(html)}</content:encoded>
<enclosure url="${cover}" length="${article.coverBytes}" type="image/png" />
<media:content url="${cover}" type="image/png" medium="image" width="${width}" height="${height}" />
</item>`;
  }).join('\n')}
</channel></rss>\n`;
}

