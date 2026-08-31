// src/features/education/data/courses.ts
// ─── Static course data — replace with API calls when ready ─────────────────

import type { Course } from "../types/course";

/**
 * Sample TCBT course with 4 lectures.
 *
 * To add more courses, simply add another object to the COURSES array.
 * To update lecture video URLs, replace the `videoUrl` fields below
 * with your CDN-hosted video URLs.
 */
export const COURSES: Course[] = [
  {
    id: "tcbt-organic-farming-101",
    folderId: "gg2nb30e2f74022da4c78b2a2a21827e18611",
    title: "TCBT वृक्षायुर्वेद विज्ञान",
    tagline: "Learn the ancient wisdom of Panchmahabhut-based farming",
    description:
      "A comprehensive course on organic farming techniques rooted in the principles of Panchmahabhut (Five Elements). " +
      "Learn how to grow healthy, chemical-free produce using traditional Indian agricultural wisdom combined with modern sustainable practices. " +
      "This course covers soil health, natural pest management, composting, and certification processes.",
    price: 999,
    thumbnail: require("@/assets/images/tcbt_education.jpg"),
    instructor: "TCBT Jaivik Kisan",
    totalDuration: 82,
    enrolledCount: 1240,
    language: "Hindi",
    lectures: [
      {
        id: "lec-01",
        title: "Introduction to TCBT & Organic Farming",
        description:
          "Welcome to the course! Learn about TCBT's mission, the importance of organic farming, and what you'll master by the end of this course.",
        duration: 15,
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        order: 1,
        isFree: true, // Free preview
      },
      {
        id: "lec-02",
        title: "Understanding Soil Health & Panchmahabhut",
        description:
          "Deep dive into soil composition, the role of the five elements (Panchmahabhut) in agriculture, and how to assess and improve your soil quality naturally.",
        duration: 20,
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        order: 2,
        isFree: false,
      },
      {
        id: "lec-03",
        title: "Organic Farming Techniques & Composting",
        description:
          "Hands-on techniques for organic farming including Jeevamrit, Beejamrit, natural composting methods, and crop rotation strategies.",
        duration: 25,
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        order: 3,
        isFree: false,
      },
      {
        id: "lec-04",
        title: "Sustainable Agriculture & PGS Certification",
        description:
          "Learn sustainable practices for long-term farm health, water conservation, natural pest management, and the PGS organic certification process.",
        duration: 22,
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        order: 4,
        isFree: false,
      },
    ],
  },
];

/** Get a course by its ID */
export function getCourseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

/** Get the default (first) course */
export function getDefaultCourse(): Course {
  return COURSES[0];
}
