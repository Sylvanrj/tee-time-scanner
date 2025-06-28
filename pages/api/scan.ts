// pages/api/scan.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

type TeeTime = {
  time: string;
  price: string;
  bookingUrl: string;
};
type CourseResult = {
  course: string;
  times: TeeTime[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CourseResult[] | { error: string }>
) {
  // 1) Log incoming request so you can verify in Vercel 💻 → Functions → Logs
  console.log('📥 [scan] incoming:', req.method, JSON.stringify(req.body));

  // 2) Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed – use POST' });
  }

  // 3) Destructure & validate payload
  const { courses, startDate, endDate, startTime, endTime, webhookUrl } = req.body;
  if (
    !Array.isArray(courses) ||
    !startDate ||
    !endDate ||
    !startTime ||
    !endTime ||
    !webhookUrl
  ) {
    console.error('❌ [scan] Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const out: CourseResult[] = [];

  // 4) Loop each selected course
  for (const course of courses) {
    let times: TeeTime[] = [];

    try {
      // — Neshanic Valley via Kenna.io API —
      if (course === 'Neshanic') {
        const date = startDate;
        const facilityId = '7083';
        const apiUrl = `https://phx-api-be-east-1b.kenna.io/v2/tee-times?date=${date}&facilityIds=${facilityId}`;

        console.log(`🔗 [scan] fetching Kenna for ${course} →`, apiUrl);
        const resp = await fetch(apiUrl, {
          headers: {
            Accept: 'application/json',
            Origin: 'https://somerset-group-v2.book.teeitup.com',
            Referer: 'https://somerset-group-v2.book.teeitup.com/',
          },
        });
        const data = await resp.json();
        const arr = Array.isArray(data[facilityId]) ? data[facilityId] : [];
        times = arr.map((t: any) => ({
          time: t.time,
          price: t.greenFee?.display ?? 'N/A',
          bookingUrl: `https://somerset-group-v2.book.teeitup.com/?course=${facilityId}&date=${date}`,
        }));
      }

      // — Francis Byrne (ForeUp)… example using cheerio if JSON API isn’t available —
      else if (course === 'Francis Byrne') {
        const pageUrl = 'https://foreupsoftware.com/index.php/booking/22528/11078#/teetimes';
        console.log(`🔗 [scan] scraping ForeUp for ${course} →`, pageUrl);
        const html = await (await fetch(pageUrl)).text();
        const $ = cheerio.load(html);
        // TODO: adjust selectors to match the actual tee-time cards…
        times = $('.time-slot-class').map((_, el) => ({
          time: $(el).find('.time').text().trim(),
          price: $(el).find('.price').text().trim(),
          bookingUrl: pageUrl,
        })).get();
      }

      // — Galloping Hill (EZLinks)… placeholder —
      else if (course === 'Galloping Hill') {
        // TODO: add your EZLinks JSON or cheerio scraper here
        console.log(`🔗 [scan] Galloping Hill scraping not yet implemented`);
      }

      // unknown course
      else {
        console.warn(`⚠️ [scan] No scraper defined for course: ${course}`);
      }
    } catch (err) {
      console.error(`❌ [scan] Error scraping ${course}:`, err);
    }

    out.push({ course, times });
  }

  // 5) Return your array of results
  return res.status(200).json(out);
}
