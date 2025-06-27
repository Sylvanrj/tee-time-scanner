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

    // ✅ Neshanic Valley (TeeItUp - but scraped with cheerio)
    if (url.includes("teeitup.com")) {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      $("button.tee-time-button").each((_, element) => {
        const time = $(element).find(".time").text().trim();
        const price = $(element).find(".green-fee").text().trim();
        if (time) {
          results.push({
            time,
            price: price || "N/A",
            bookingUrl: url,
          });
        }
      });
    }

    // ✅ Francis Byrne (ForeUp)
    else if (url.includes("foreupsoftware.com")) {
      const today = new Date().toISOString().split("T")[0];
      const parts = url.split("/");
      const company_id = parts[6];
      const course_id = parts[7];
      const apiUrl = `https://foreupsoftware.com/index.php/api/booking/times/${company_id}/${course_id}/${today}?time=all&holes=all`;

      const response = await fetch(apiUrl, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("ForeUp response is not an array");
      }

      results = data
        .filter((slot: any) => !slot.is_reserved)
        .map((slot: any) => ({
          time: slot.time,
          price: slot.green_fee || "N/A",
          bookingUrl: url,
        }));
    }

    else {
      return res.status(400).json({ error: "Unsupported booking site" });
    }

    res.status(200).json({ times: results });
  } catch (error) {
    console.error("Scraper error:", error);
    res.status(500).json({ error: "Failed to fetch or parse tee times" });
  }
}
