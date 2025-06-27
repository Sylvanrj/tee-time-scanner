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

      if (!course) {
        return res.status(400).json({ error: "Missing course ID in URL" });
      }

      const apiUrl = `https://somerset-group-v2.book.teeitup.com/api/tee-times?date=${date}&course_id=${course}&holes=18&players=1`;
      const response = await fetch(apiUrl);
      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        throw new Error("TeeItUp response is not valid JSON");
      }

      const data = await response.json();

      results = data.tee_times.map((t: any) => ({
        time: t.time,
        price: t.green_fee?.display || "N/A",
        bookingUrl: url,
      }));
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

      const data = await response.json();

      results = Array.isArray(data)
        ? data
            .filter((slot: any) => slot.is_reserved === false)
            .map((slot: any) => ({
              time: slot.time,
              price: slot.green_fee || "N/A",
              bookingUrl: url,
            }))
        : [];
    }

    // 🔴 Not yet supported
    else {
      return res.status(400).json({ error: "Unsupported booking site" });
    }

    res.status(200).json({ times: results });
  } catch (error: any) {
    console.error("Scraper error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch or parse tee times" });
  }
}
