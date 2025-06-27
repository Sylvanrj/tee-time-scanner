import type { NextApiRequest, NextApiResponse } from 'next';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

type TeeTime = {
  time: string;
  price?: string;
  bookingUrl: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST supported' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    let results: TeeTime[] = [];

    // 🟢 Scrape ForeUp public booking page (e.g. Francis Byrne)
    if (url.includes('foreupsoftware.com')) {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      $('button.booking-time-button').each((_, el) => {
        const time = $(el).text().trim();
        const bookingUrl = url;
        if (time) {
          results.push({ time, price: 'N/A', bookingUrl });
        }
      });
    }

    // 🟢 Scrape TeeItUp public booking page (e.g. Neshanic Valley)
    else if (url.includes('teeitup.com')) {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      $('div[data-testid="time-button"]').each((_, el) => {
        const time = $(el).text().trim();
        const bookingUrl = url;
        if (time) {
          results.push({ time, price: 'N/A', bookingUrl });
        }
      });
    }

    // 🔴 Unsupported domains
    else {
      return res.status(400).json({ error: 'Unsupported booking site' });
    }

    return res.status(200).json({ times: results });
  } catch (error: any) {
    console.error('Scraper error:', error);
    return res.status(500).json({ error: 'Failed to scrape tee times' });
  }
}
