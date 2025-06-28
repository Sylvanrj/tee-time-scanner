import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'url';
import cheerio from 'cheerio';

type TeeTime = {
  time: string;
  price: string;
  course?: string;
  bookingUrl: string;
};

type ScanResponse = {
  [courseName: string]: TeeTime[];
};

const handler = async (req: NextApiRequest, res: NextApiResponse<ScanResponse | { error: string }>) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { courses, startDate, endDate, startTime, endTime } = req.body;

  if (!Array.isArray(courses) || !startDate || !endDate || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const results: ScanResponse = {};

  for (const course of courses) {
    try {
      let courseResults: TeeTime[] = [];

      if (course === 'Neshanic') {
        const url = 'https://www.golfteeitup.com/tee-times/neshanic-valley';

        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        $('button[data-testid="tee-time-button"]').each((_, el) => {
          const label = $(el).attr('aria-label') || '';

          const timeMatch = label.match(/\b(\d{1,2}:\d{2}(?::\d{2})? [AP]M)\b/);
          const priceMatch = label.match(/\$\d+(?:\.\d{2})?(?: – \$\d+(?:\.\d{2})?)?/);
          const courseMatch = label.match(/selector for (.*?) -/);

          if (timeMatch && priceMatch) {
            courseResults.push({
              time: timeMatch[1],
              price: priceMatch[0],
              course: courseMatch ? courseMatch[1] : 'Neshanic',
              bookingUrl: url,
            });
          }
        });
      }

      // Add more course handlers here as needed

      results[course] = courseResults;
    } catch (error) {
      console.error(`Scraper error for ${course}:`, error);
      results[course] = [];
    }
  }

  res.status(200).json(results);
};

export default handler;

