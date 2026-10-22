const offset = '+05:00';
export const releaseTimes = ['12:00', '15:00', '18:00'];
function dayAtYekaterinburg(value) { return new Date(new Date(value).getTime() + 5 * 3600000).toISOString().slice(0, 10); }
export function allocateReleaseSlots(articles, { now = new Date(), count = 3, startDate = '2026-10-23' } = {}) {
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp) || !Number.isInteger(count) || count < 1 || count > 30) throw new TypeError('Invalid scheduling request');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new TypeError('Invalid start date');
  const firstDay = [dayAtYekaterinburg(now), startDate].sort().at(-1);
  const day = new Date(firstDay + 'T00:00:00Z');
  const byDay = new Map();
  for (const article of articles) {
    const date = new Date(article.publishedAt);
    if (!Number.isFinite(date.getTime())) throw new TypeError('Invalid article date');
    const key = dayAtYekaterinburg(date);
    const values = byDay.get(key) ?? [];
    values.push(date.getTime()); byDay.set(key, values);
  }
  const result = [];
  for (let days = 0; days < 366 && result.length < count; days++, day.setUTCDate(day.getUTCDate() + 1)) {
    const key = day.toISOString().slice(0, 10);
    const occupied = [...(byDay.get(key) ?? [])];
    for (const time of releaseTimes) {
      if (result.length === count || occupied.length >= 3) break;
      const value = key + 'T' + time + ':00' + offset;
      const candidate = new Date(value).getTime();
      if (candidate < timestamp + 3600000 || occupied.some(t => Math.abs(t - candidate) < 3 * 3600000)) continue;
      result.push(value); occupied.push(candidate);
    }
  }
  if (result.length !== count) throw new Error('No free release slots');
  return result;
}

