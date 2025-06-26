import { useEffect, useState } from "react";

type Course = {
  name: string;
  url: string;
};

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [results, setResults] = useState<{ course: string; times: string[] }[]>([]);
  const [loading, setLoading] = useState(false);

  // Load saved courses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("courses");
    if (saved) {
      setCourses(JSON.parse(saved));
    }
  }, []);

  const handleCourseToggle = (name: string) => {
    setSelectedCourses((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleScan = async () => {
    setLoading(true);
    setResults([]);
    const matchedCourses: { course: string; times: string[] }[] = [];

    for (const name of selectedCourses) {
      const course = courses.find((c) => c.name === name);
      if (!course) continue;

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: course.url }),
        });

        const data = await res.json();
        matchedCourses.push({ course: name, times: data.times || [] });
      } catch (err) {
        matchedCourses.push({ course: name, times: ["Error fetching data"] });
      }
    }

    setResults(matchedCourses);
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Tee Time Scanner Dashboard</h1>

      <h2 style={{ marginTop: "1.5rem" }}>Select Courses</h2>
      {courses.map((course, idx) => (
        <div key={idx}>
          <label>
            <input
              type="checkbox"
              value={course.name}
              checked={selectedCourses.includes(course.name)}
              onChange={() => handleCourseToggle(course.name)}
            />
            {course.name}
          </label>
        </div>
      ))}

      <h2 style={{ marginTop: "1.5rem" }}>Date Range</h2>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        style={{ marginRight: "1rem" }}
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />

      <h2 style={{ marginTop: "1.5rem" }}>Time Range</h2>
      <input
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        style={{ marginRight: "1rem" }}
      />
      <input
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />

      <h2 style={{ marginTop: "1.5rem" }}>Slack Webhook URL</h2>
      <input
        type="text"
        value={slackWebhook}
        onChange={(e) => setSlackWebhook(e.target.value)}
        placeholder="https://hooks.slack.com/services/..."
        style={{ width: "100%", padding: "0.5rem" }}
      />

      <div style={{ marginTop: "2rem" }}>
        <button onClick={handleScan} style={{ padding: "0.75rem 1.5rem" }}>
          {loading ? "Scanning..." : "Start Scan"}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Scan Results</h2>
          {results.map((result, idx) => (
            <div key={idx} style={{ marginBottom: "1rem" }}>
              <strong>{result.course}</strong>
              <ul>
                {result.times.map((time, i) => (
                  <li key={i}>{time}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

