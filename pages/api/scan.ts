import type { NextApiRequest, NextApiResponse } from 'next';
import { fetch } from 'undici';

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

    // 🟢 Neshanic Valley – TeeItUp System
    if (url.includes("teeitup.com")) {
      const searchUrl = new URL(url);
      const date = searchUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];
      const course = searchUrl.searchParams.get("course");

      const apiUrl = `https://somerset-group-v2.book.teeitup.com/api/tee-times?date=${date}&course_id=${course}&holes=18&players=1`;
      const response = await fetch(apiUrl);
      const raw = await response.text();

      try {
        const data = JSON.parse(raw);

        if (!Array.isArray(data.tee_times)) {
          throw new Error("Expected tee_times to be an array");
        }

        results = data.tee_times.map((t: any) => ({
          time: t.time,
          price: t.green_fee?.display || "N/A",
          bookingUrl: url,
        }));
      } catch (err) {
        console.error("❌ TeeItUp parsing error:", err);
        console.error("Raw response:", raw.slice(0, 300));
        return res.status(500).json({ error: "TeeItUp response was not JSON or expected format" });
      }
    }

    // 🟢 Francis Byrne – ForeUp Software
    else if (url.includes("foreupsoftware.com")) {
      const today = new Date().toISOString().split("T")[0];
      const parts = url.split("/");
      const company_id = parts[6];
      const course_id = parts[7];

      const apiUrl = `https://foreupsoftware.com/index.php/api/booking/times/${company_id}/${course_id}/${today}?time=all&holes=all`;
      const response = await fetch(apiUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const raw = await response.text();

      try {
        const data = JSON.parse(raw);

        if (!Array.isArray(data)) {
          throw new Error("Expected response to be an array");
        }

        results = data
          .filter((slot: any) => slot.is_reserved === false)
          .map((slot: any) => ({
            time: slot.time,
            price: slot.green_fee || "N/A",
            bookingUrl: url,
          }));
      } catch (err) {
        console.error("❌ ForeUp parsing error:", err);
        console.error("Raw response:", raw.slice(0, 300));
        return res.status(500).json({ error: "ForeUp response was not JSON or expected format" });
      }
    }

    // 🔴 Not yet supported
    else {
      return res.status(400).json({ error: "Unsupported booking site" });
    }

    res.status(200).json({ times: results });
  } catch (error) {
    console.error("Scraper error:", error);
    res.status(500).json({ error: "Failed to fetch or parse tee times" });
  }
}
