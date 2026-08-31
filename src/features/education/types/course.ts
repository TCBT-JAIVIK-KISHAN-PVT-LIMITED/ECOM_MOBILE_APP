// src/features/education/types/course.ts
// ─── TypeScript interfaces for Education feature ─────────────────────────────

/** A single lecture within a course */
export interface Lecture {
  /** Unique lecture ID */
  id: string;
  /** Display title */
  title: string;
  /** Brief description of lecture content */
  description: string;
  /** Optional Zoho WorkDrive File ID */
  workDriveFileId?: string;
  /** Duration in minutes */
  duration: number;
  /** Direct video URL or fallback URL */
  videoUrl: string;
  /** Display order (1-based) */
  order: number;
  /** If true, this lecture is accessible without purchasing the course */
  isFree: boolean;
}

/** A paid course containing multiple lectures */
export interface Course {
  /** Unique course ID */
  id: string;
  /** Zoho WorkDrive Folder ID */
  folderId?: string;
  /** Course display title */
  title: string;
  /** Full course description */
  description: string;
  /** Price in INR */
  price: number;
  /** Thumbnail/cover image URL or require() asset */
  thumbnail: any;
  /** Ordered list of lectures */
  lectures: Lecture[];
  /** Total duration in minutes (sum of all lectures) */
  totalDuration: number;
  /** Instructor name */
  instructor: string;
  /** Short tagline */
  tagline: string;
  /** Number of enrolled students (for social proof) */
  enrolledCount: number;
  /** Course language */
  language: string;
}

/** Tracks a user's progress within a course */
export interface CourseProgress {
  /** ID of the last watched lecture */
  lastLectureId: string;
  /** IDs of lectures marked as complete */
  completedLectures: string[];
}
