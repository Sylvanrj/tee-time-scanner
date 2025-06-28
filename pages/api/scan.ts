import type { NextApiRequest, NextApiResponse } from 'next';

const COURSE_ID = '7083'; // Neshanic Valley
const API_BASE = 'https://phx-api-be-east-1b.kenna.io/v2/tee-times';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { startDate, endDate, webhookUrl } = req.body;

    if (!startDate || !endDate || !webhookUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const dates = getDateRange(startDate, endDate);
    const results: any[] = [];

    for (const date of dates) {
      const url = `${API_BASE}?date=${date}&facilityIds=${COURSE_ID}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Origin': 'https://somerset-group-v2.book.teeitup.com',
          'Referer': 'https://somerset-group-v2.book.teeitup.com/',
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch ${date}:`, response.statusText);
        continue;
      }

      const data = await response.json();

      // Expecting an array of times under a 'teeTimes' key or similar
      const teeTimes = data?.[COURSE_ID] ?? [];

      for (const t of teeTimes) {
        results.push({
          date: t.date,
          time: t.time,
          price: t.greenFee?.display ?? 'N/A',
          players: t.players,
          bookingUrl: `https://somerset-group-v2.book.teeitup.com/?course=${COURSE_ID}&date=${date}`,
        });
      }
    }

    // Send to Slack
    if (results.length) {
      await fetch(webhookUrl, {
        method: 'POST',
        body: JSON.stringify({
          text: `✅ Tee times found for Neshanic:\n` + results.map(r =>
            `• ${r.date} ${r.time} — ${r.price} (${r.players}p)\n${r.bookingUrl}`
          ).join('\n')
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    }

    res.status(200).json({ results });
  } catch (err) {
    console.error('Scraper error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getDateRange(start: string, end: string): string[] {
  const dates = [];
  let current = new Date(start);
  const last = new Date(end);

  while (current <= last) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
