// src/features/education/store/educationSlice.ts
// ─── Redux slice for education feature — purchases & progress ───────────────

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../../store/store";
import type { CourseProgress } from "../types/course";

interface EducationState {
  /** List of purchased course IDs */
  purchasedCourses: string[];
  /** Progress per course */
  courseProgress: Record<string, CourseProgress>;
}

const initialState: EducationState = {
  purchasedCourses: [],
  courseProgress: {},
};

const educationSlice = createSlice({
  name: "education",
  initialState,
  reducers: {
    /** Mark a course as purchased */
    purchaseCourse(state, action: PayloadAction<string>) {
      const courseId = action.payload;
      if (!state.purchasedCourses.includes(courseId)) {
        state.purchasedCourses.push(courseId);
      }
    },

    /** Sync all enrolled course IDs from user profile/backend */
    syncEnrolledCourses(state, action: PayloadAction<string[]>) {
      const courseIds = action.payload || [];
      for (const id of courseIds) {
        if (!state.purchasedCourses.includes(id)) {
          state.purchasedCourses.push(id);
        }
      }
    },

    /** Mark a lecture as complete */
    markLectureComplete(
      state,
      action: PayloadAction<{ courseId: string; lectureId: string }>
    ) {
      const { courseId, lectureId } = action.payload;
      if (!state.courseProgress[courseId]) {
        state.courseProgress[courseId] = {
          lastLectureId: lectureId,
          completedLectures: [],
        };
      }
      const progress = state.courseProgress[courseId];
      if (!progress.completedLectures.includes(lectureId)) {
        progress.completedLectures.push(lectureId);
      }
    },

    /** Update the last watched lecture */
    setLastWatched(
      state,
      action: PayloadAction<{ courseId: string; lectureId: string }>
    ) {
      const { courseId, lectureId } = action.payload;
      if (!state.courseProgress[courseId]) {
        state.courseProgress[courseId] = {
          lastLectureId: lectureId,
          completedLectures: [],
        };
      }
      state.courseProgress[courseId].lastLectureId = lectureId;
    },

    /** Reset all education state (e.g. on logout) */
    resetEducation() {
      return initialState;
    },
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────
export const {
  purchaseCourse,
  syncEnrolledCourses,
  markLectureComplete,
  setLastWatched,
  resetEducation,
} = educationSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectIsPurchased = (state: RootState, courseId: string) =>
  state.education.purchasedCourses.includes(courseId);

export const selectCourseProgress = (state: RootState, courseId: string) =>
  state.education.courseProgress[courseId] ?? null;

export const selectPurchasedCourses = (state: RootState) =>
  state.education.purchasedCourses;

export default educationSlice.reducer;
