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
  console.log('📥 [scan] incoming:', JSON.stringify(req.body));

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed – use POST' });
  }

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

  for (const course of courses) {
    let times: TeeTime[] = [];

    if (course === 'Neshanic') {
      try {
        const date = startDate;
        const facilityId = '7083';
        const apiUrl = `https://phx-api-be-east-1b.kenna.io/v2/tee-times?date=${date}&facilityIds=${facilityId}`;

        console.log(`🔗 [Kenna] GET`, apiUrl);
        const resp = await fetch(apiUrl, {
          headers: {
            Accept: 'application/json',
            Origin: 'https://somerset-group-v2.book.teeitup.com',
            Referer: 'https://somerset-group-v2.book.teeitup.com/',
          },
        });

        const text = await resp.text();
        console.log(`👀 [Kenna] raw response text:`, text.slice(0, 200));

        let data: any;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          console.error('❌ [Kenna] JSON parse error:', parseErr);
          // if it's not JSON, bail out for this course
          continue;
        }

        const arr = Array.isArray(data[facilityId]) ? data[facilityId] : [];
        console.log(`📊 [Kenna] found ${arr.length} slots for ${facilityId}`);

        times = arr.map((t: any) => ({
          time: t.time,
          price: t.greenFee?.display ?? 'N/A',
          bookingUrl: `https://somerset-group-v2.book.teeitup.com/?course=${facilityId}&date=${date}`,
        }));
      } catch (err) {
        console.error(`❌ [scan] Error scraping Neshanic:`, err);
      }
    }

    else if (course === 'Francis Byrne') {
      // …your ForeUp scraper (unchanged)…
      try {
        const pageUrl =
          'https://foreupsoftware.com/index.php/booking/22528/11078#/teetimes';
        const html = await (await fetch(pageUrl)).text();
        const $ = cheerio.load(html);
        times = $('.teetime-card')
          .map((_, el) => ({
            time: $(el).find('.time').text().trim(),
            price: $(el).find('.price').text().trim(),
            bookingUrl: pageUrl,
          }))
          .get();
        console.log(`📊 [ForeUp] scraped ${times.length} slots`);
      } catch (err) {
        console.error(`❌ [scan] Error scraping Francis Byrne:`, err);
      }
    }

    else {
      console.warn(`⚠️ [scan] no scraper defined for "${course}"`);
    }

    out.push({ course, times });
  }

  console.log('🚀 [scan] final results:', JSON.stringify(out));
  res.status(200).json(out);
}
