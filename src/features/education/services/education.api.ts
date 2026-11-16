// src/features/education/services/education.api.ts
// ─── API service for Course Lectures & Zoho WorkDrive Video Streaming ──────────

import { apiRequest } from "../../../shared/services/api.client";
import type { Lecture } from "../types/course";

export interface WatchLectureResponse {
  lectureId: string;
  videoUrl: string;
  title?: string;
  duration?: number;
  workDriveFileId?: string;
  isFree?: boolean;
}

export interface CourseLecturesResponse {
  courseId: string;
  folderId?: string;
  lectures: Lecture[];
}

/**
 * Fetch the authenticated, secure video stream URL for a given lecture.
 *
 * Calls: GET /education/lectures/:lectureId/watch
 * (Passes JWT Bearer token automatically via apiRequest)
 *
 * Backend performs:
 * 1. Checks if user is logged in
 * 2. Checks if user has purchased the course (or lecture is free)
 * 3. Fetches dynamic download/stream URL from Zoho WorkDrive for the folder
 * 4. Returns { videoUrl: "..." }
 */
export async function fetchLectureWatchUrl(
  lectureId: string,
  courseId?: string
): Promise<WatchLectureResponse> {
  const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : "";
  return await apiRequest<WatchLectureResponse>(
    `/education/lectures/${encodeURIComponent(lectureId)}/watch${query}`
  );
}

/**
 * Fetch live course lectures list from the backend / Zoho WorkDrive folder.
 * Calls: GET /education/courses/:courseId/lectures
 */
export async function fetchCourseLectures(
  courseId: string,
  folderId?: string
): Promise<CourseLecturesResponse> {
  const query = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : "";
  return await apiRequest<CourseLecturesResponse>(
    `/education/courses/${encodeURIComponent(courseId)}/lectures${query}`
  );
}
