import { useState, useEffect } from "react";

type Course = {
  name: string;
  url: string;
};

export default function Admin() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  // Load saved courses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("courses");
    if (saved) {
      setCourses(JSON.parse(saved));
    }
  }, []);

  // Save courses to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("courses", JSON.stringify(courses));
  }, [courses]);

  const addCourse = () => {
    if (!name || !url) return;
    const newCourses = [...courses, { name, url }];
    setCourses(newCourses);
    setName("");
    setUrl("");
  };

  const removeCourse = (index: number) => {
    const updated = [...courses];
    updated.splice(index, 1);
    setCourses(updated);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Add or Remove a Golf Course</h1>
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
          <li key={idx} style={{ marginBottom: "0.5rem" }}>
            <strong>{course.name}</strong>:{" "}
            <a href={course.url} target="_blank" rel="noopener noreferrer">
              {course.url}
            </a>{" "}
            <button
              onClick={() => removeCourse(idx)}
              style={{ marginLeft: "1rem", color: "red" }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
