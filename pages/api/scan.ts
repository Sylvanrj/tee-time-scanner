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

  console.log("🔍 Scan request received:", url);

  let results: TeeTime[] = [];

  try {
    // 🟢 Neshanic Valley – TeeItUp
    if (url.includes("teeitup.com")) {
      try {
        const searchUrl = new URL(url);
        const date = searchUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];
        const course = searchUrl.searchParams.get("course");

        if (!course) throw new Error("Missing course ID in URL");

        const apiUrl = `https://somerset-group-v2.book.teeitup.com/api/tee-times?date=${date}&course_id=${course}&holes=18&players=1`;
        console.log("🌐 Fetching Neshanic from:", apiUrl);

        const data = await fetch(apiUrl).then(res => res.json());
        console.log("✅ Fetched teeitup.com data:", data);

        if (!Array.isArray(data.tee_times)) throw new Error("tee_times is not an array");

        results = data.tee_times.map((t: any) => ({
          time: t.time,
          price: t.green_fee?.display || "N/A",
          bookingUrl: url,
        }));
      } catch (err) {
        console.error("❌ Neshanic error:", err);
        return res.status(500).json({ error: "Failed to fetch tee times from Neshanic" });
      }
    }

    // 🟢 Francis Byrne – ForeUp Software
    else if (url.includes("foreupsoftware.com")) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const parts = url.split("/");
        const company_id = parts[6];
        const course_id = parts[7];

        const apiUrl = `https://foreupsoftware.com/index.php/api/booking/times/${company_id}/${course_id}/${today}?time=all&holes=all`;
        console.log("🌐 Fetching Francis Byrne from:", apiUrl);

        const response = await fetch(apiUrl, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        console.log("✅ Fetched foreup data:", data);

        if (!Array.isArray(data)) throw new Error("ForeUp data is not an array");

        results = data
          .filter((slot: any) => slot.is_reserved === false)
          .map((slot: any) => ({
            time: slot.time,
            price: slot.green_fee || "N/A",
            bookingUrl: url,
          }));
      } catch (err) {
        console.error("❌ ForeUp error:", err);
        return res.status(500).json({ error: "Failed to fetch tee times from Francis Byrne" });
      }
    }

    // 🔴 Unsupported Course
    else {
      return res.status(400).json({ error: "Unsupported booking site" });
    }

    console.log("📦 Final tee time results:", results);
    return res.status(200).json({ times: results });

  } catch (error) {
    console.error("🚨 General error:", error);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

