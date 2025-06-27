import type { NextApiRequest, NextApiResponse } from 'next';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

type TeeTime = { time: string; price?: string; bookingUrl: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST supported' });
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);
    const results: TeeTime[] = [];

    // Example: TeeItUp page embeds tee times in a JS variable
    const scriptText = $('script')
      .filter((i, el) => $(el).html()?.includes('tee_times'))
      .first()
      .html() || '';

    const match = scriptText.match(/tee_times\s*=\s*(\[[\s\S]*?\]);/);
    if (match) {
      const data = JSON.parse(match[1]);
      for (const t of data) {
        results.push({ time: t.time, price: t.price || 'N/A', bookingUrl: url });
      }
    }

    if (!results.length) {
      // fallback: find DOM elements manually
      $('.tee-time-row').each((i, el) => {
        const time = $(el).find('.time-cell').text().trim();
        const price = $(el).find('.price-cell').text().trim();
        results.push({ time, price, bookingUrl: url });
      });
    }

    return res.status(200).json({ times: results });
  } catch (err: any) {
    console.error('Scraper error:', err);
    return res.status(500).json({ error: 'Failed to fetch or parse tee times' });
  }
}
