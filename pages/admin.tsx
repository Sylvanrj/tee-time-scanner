import { useState } from "react";

type Course = {
  name: string;
  url: string;
};

export default function Admin() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const addCourse = () => {
    if (!name || !url) return;
    setCourses([...courses, { name, url }]);
    setName("");
    setUrl("");
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Add a Golf Course</h1>
      <div style={{ marginTop: "1rem" }}>
        <input
          placeholder="Course Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginRight: "0.5rem", padding: "0.5rem" }}
        />
        <input
          placeholder="Booking URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ marginRight: "0.5rem", padding: "0.5rem" }}
        />
        <button onClick={addCourse} style={{ padding: "0.5rem 1rem" }}>
          Add Course
        </button>
      </div>

      <h2 style={{ marginTop: "2rem" }}>Saved Courses</h2>
      <ul>
        {courses.map((course, idx) => (
          <li key={idx}>
            <strong>{course.name}</strong>:{" "}
            <a href={course.url} target="_blank" rel="noopener noreferrer">
              {course.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
