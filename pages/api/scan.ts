import type { NextApiRequest, NextApiResponse } from 'next';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

type TeeTime = { time: string; price: string; bookingUrl: string };
type CourseResult = { course: string; times: TeeTime[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CourseResult[] | { error: string }>
) {
  console.log("📥 scan request body:", req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST supported' });
  }

  const { courses, startDate, endDate, startTime, endTime, webhookUrl } = req.body;
  if (
    !Array.isArray(courses) ||
    !startDate || !endDate ||
    !startTime || !endTime ||
    !webhookUrl
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const out: CourseResult[] = [];

  for (const name of courses) {
    let times: TeeTime[] = [];

    // Example for Neshanic (Kenna API)
    if (name === 'Neshanic') {
      const date = startDate; // you can loop multiple dates here
      const url = `https://phx-api-be-east-1b.kenna.io/v2/tee-times?date=${date}&facilityIds=7083`;
      const resp = await fetch(url, {
        headers: { 
          Accept: 'application/json',
          Origin: 'https://somerset-group-v2.book.teeitup.com',
          Referer: 'https://somerset-group-v2.book.teeitup.com/'
        }
      });
      const data = await resp.json();
      const arr = Array.isArray(data['7083']) ? data['7083'] : [];
      times = arr.map((t: any) => ({
        time: t.time,
        price: t.greenFee?.display || 'N/A',
        bookingUrl: `https://somerset-group-v2.book.teeitup.com/?course=7083&date=${date}`
      }));
    }

    // Add more course scrapers here…

    out.push({ course: name, times });
  }

  return res.status(200).json(out);
}
