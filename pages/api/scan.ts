import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST supported' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Example logic: Find tee time listings
    const times: string[] = [];
    $('[class*=TeeTimeCard]').each((_, el) => {
      const timeText = $(el).text();
      if (timeText.includes('AM') || timeText.includes('PM')) {
        times.push(timeText.trim());
      }
    });

    res.status(200).json({ times: times.slice(0, 10) }); // Return first 10 matches
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch or parse page' });
  }
}

