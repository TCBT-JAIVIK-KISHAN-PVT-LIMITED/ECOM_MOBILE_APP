// src/features/education/screens/CourseDetailScreen.tsx
// ─── Course detail screen with lecture list & purchase flow ──────────────────

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import type { RootState } from "../../../store/store";
import LectureCard from "../components/LectureCard";
import { getDefaultCourse } from "../data/courses";
import { fetchCourseLectures } from "../services/education.api";
import {
  purchaseCourse,
  selectCourseProgress,
  selectIsPurchased,
} from "../store/educationSlice";
import type { Lecture } from "../types/course";

// ─── Zoho Payments import ─────────────────────────────────────────────────────
import { apiRequest } from "../../../shared/services/api.client";
import {
  openCheckout
} from "../../checkout/services/zoho-payments";

const { width } = Dimensions.get("window");
const HERO_HEIGHT = 280;
const GREEN = "#196F1B";
const GREEN_DARK = "#0F5A14";
const BLUE = "#0D47A1";

export default function CourseDetailScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const course = getDefaultCourse();

  const isPurchased = useSelector((state: RootState) =>
    selectIsPurchased(state, course.id)
  );
  const progress = useSelector((state: RootState) =>
    selectCourseProgress(state, course.id)
  );
  const user = useSelector((state: RootState) => state.user);

  const [lectures, setLectures] = useState<Lecture[]>(course.lectures);
  const [purchasing, setPurchasing] = useState(false);

  // Sync state if static courses data updates
  useEffect(() => {
    setLectures(course.lectures);
  }, [course.lectures]);

  // Check backend enrollment status for logged-in selective users
  useEffect(() => {
    let isMounted = true;
    async function checkEnrollment() {
      // 1. Check local Redux user state
      if (user?.enrolledCourses?.includes(course.id)) {
        dispatch(purchaseCourse(course.id));
        return;
      }

      // 2. Query backend for real-time enrollment if logged in
      if (user?.isLoggedIn && user?.userId) {
        try {
          const res = await apiRequest<{ enrolled_courses: string[] }>(
            `/users/${user.userId}/courses`
          );
          if (isMounted && res?.enrolled_courses?.includes(course.id)) {
            dispatch(purchaseCourse(course.id));
          }
        } catch {
          // Ignore network errors
        }
      }
    }

    checkEnrollment();
    return () => {
      isMounted = false;
    };
  }, [user?.isLoggedIn, user?.userId, user?.enrolledCourses, course.id, dispatch]);

  // Fetch live lectures from Zoho WorkDrive folder if available
  useEffect(() => {
    let isMounted = true;
    async function loadLectures() {
      try {
        const res = await fetchCourseLectures(course.id, course.folderId);
        if (isMounted && res?.lectures && res.lectures.length > 0) {
          setLectures(res.lectures);
        }
      } catch {
        // Fallback to local course definition
      }
    }
    loadLectures();
    return () => {
      isMounted = false;
    };
  }, [course.id, course.folderId]);

  // Animations
  const heroAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, contentAnim]);

  const totalLectures = lectures.length;
  const completedCount = progress?.completedLectures.length ?? 0;
  const progressPercent =
    totalLectures > 0 ? (completedCount / totalLectures) * 100 : 0;

  // Format total duration
  const formatTotalDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  // ─── Purchase handler ─────────────────────────────────────────────────────
  const handleBuyNow = useCallback(async () => {
    setPurchasing(true);
    try {
      // 1. Create a payment session on the backend
      const orderResponse = await apiRequest<{
        paymentSessionId: string;
        orderId: string;
      }>("/education/orders", {
        method: "POST",
        body: {
          courseId: course.id,
          amount: course.price,
          description: course.title,
        },
      });

      // 2. Open Zoho Payments checkout
      const result = await openCheckout(orderResponse.paymentSessionId);

      if (result.status === "success") {
        dispatch(purchaseCourse(course.id));
        Alert.alert(
          "🎉 Purchase Successful!",
          "You now have full access to all lectures. Happy learning!",
          [{ text: "Start Learning", style: "default" }]
        );
      } else if (result.status === "cancelled") {
        // User cancelled — do nothing
      } else {
        Alert.alert(
          "Payment Failed",
          result.errorMessage || "Something went wrong. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      console.error("[Education] Purchase error:", error);
      // If API is not set up yet, allow demo purchase
      if (
        error?.message?.includes("Network") ||
        error?.message?.includes("fetch") ||
        error?.message?.includes("404") ||
        error?.message?.includes("500")
      ) {
        Alert.alert(
          "Demo Mode",
          "Payment backend is not configured yet. Would you like to unlock the course in demo mode?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unlock (Demo)",
              onPress: () => dispatch(purchaseCourse(course.id)),
            },
          ]
        );
      } else {
        Alert.alert("Error", "Unable to process payment. Please try again.");
      }
    } finally {
      setPurchasing(false);
    }
  }, [course, dispatch]);

  // ─── Lecture press handler ────────────────────────────────────────────────
  const handleLecturePress = useCallback(
    (lecture: Lecture) => {
      if (!lecture.isFree && !isPurchased) {
        Alert.alert(
          "🔒 Premium Content",
          "Purchase the course to access this lecture.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Buy Now", onPress: handleBuyNow },
          ]
        );
        return;
      }

      router.push({
        pathname: "/education/lecture",
        params: {
          courseId: course.id,
          lectureId: lecture.id,
        },
      } as any);
    },
    [isPurchased, course.id, handleBuyNow]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Section ── */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={course.thumbnail}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.9)"]}
            style={styles.heroGradient}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: 12 }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Hero text overlay */}
          <View style={styles.heroContent}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="school" size={12} color={GREEN} />
                <Text style={styles.heroBadgeText}>TCBT Education</Text>
              </View>
              <View style={styles.heroBadgeLang}>
                <Text style={styles.heroBadgeLangText}>
                  {course.language}
                </Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{course.title}</Text>
            <Text style={styles.heroTagline}>{course.tagline}</Text>
          </View>
        </Animated.View>

        {/* ── Content Section ── */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="book-outline" size={18} color={GREEN} />
              <Text style={styles.statValue}>{totalLectures}</Text>
              <Text style={styles.statLabel}>Lectures</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={18} color={GREEN} />
              <Text style={styles.statValue}>
                {formatTotalDuration(course.totalDuration)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={18} color={GREEN} />
              <Text style={styles.statValue}>
                {course.enrolledCount.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
          </View>

          {/* Instructor */}
          <View style={styles.instructorRow}>
            <View style={styles.instructorAvatar}>
              <Ionicons name="person" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.instructorLabel}>Instructor</Text>
              <Text style={styles.instructorName}>{course.instructor}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Course</Text>
            <Text style={styles.description}>{course.description}</Text>
          </View>

          {/* Progress bar (if purchased) */}
          {isPurchased && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Your Progress</Text>
                <Text style={styles.progressPercent}>
                  {Math.round(progressPercent)}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progressPercent}%` }]}
                />
              </View>
              <Text style={styles.progressSubtext}>
                {completedCount} of {totalLectures} lectures completed
              </Text>
            </View>
          )}

          {/* Lectures list */}
          <View style={styles.section}>
            <View style={styles.lectureHeaderRow}>
              <Text style={styles.sectionTitle}>Course Content</Text>
              <Text style={styles.lectureCount}>
                {totalLectures} lectures • {formatTotalDuration(course.totalDuration)}
              </Text>
            </View>

            {lectures.map((lecture) => {
              const isLocked = !lecture.isFree && !isPurchased;
              const isCompleted =
                progress?.completedLectures.includes(lecture.id) ?? false;
              const isPlaying = progress?.lastLectureId === lecture.id;

              return (
                <LectureCard
                  key={lecture.id}
                  lecture={lecture}
                  isLocked={isLocked}
                  isCompleted={isCompleted}
                  isCurrentlyPlaying={isPlaying}
                  onPress={() => handleLecturePress(lecture)}
                />
              );
            })}
          </View>

          {/* Bottom spacer for the fixed button */}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* ── Fixed bottom CTA ── */}
      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isPurchased ? (
          <TouchableOpacity
            style={styles.ctaBtnPurchased}
            onPress={() => {
              const firstLecture = lectures[0];
              const resumeLecture = progress?.lastLectureId
                ? lectures.find((l) => l.id === progress.lastLectureId)
                : firstLecture;
              handleLecturePress(resumeLecture || firstLecture);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle" size={22} color="#fff" />
            <Text style={styles.ctaBtnText}>
              {progress?.lastLectureId ? "Continue Learning" : "Start Learning"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ctaRow}>
            <View style={styles.ctaPriceWrap}>
              <Text style={styles.ctaPriceLabel}>Course Price</Text>
              <Text style={styles.ctaPrice}>₹{course.price}</Text>
            </View>
            <TouchableOpacity
              style={styles.ctaBtnBuy}
              onPress={handleBuyNow}
              activeOpacity={0.8}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cart" size={20} color="#fff" />
                  <Text style={styles.ctaBtnText}>Buy Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // ── Hero ──
  hero: {
    height: HERO_HEIGHT,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN,
    letterSpacing: 0.3,
  },
  heroBadgeLang: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeLangText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroTagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  // ── Content ──
  content: {
    marginTop: -16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#F8F9FA",
    paddingTop: 4,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E8E8E8",
    marginVertical: 4,
  },

  // ── Instructor ──
  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  instructorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  instructorLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },
  instructorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginTop: 1,
  },

  // ── Sections ──
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    letterSpacing: 0.15,
  },

  // ── Progress ──
  progressSection: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "800",
    color: GREEN,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C8E6C9",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  progressSubtext: {
    fontSize: 11,
    color: "#4CAF50",
    marginTop: 6,
    fontWeight: "500",
  },

  // ── Lecture header ──
  lectureHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  lectureCount: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },

  // ── CTA Bar ──
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E0E0E0",
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 15,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  ctaPriceWrap: {
    flex: 1,
  },
  ctaPriceLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },
  ctaPrice: {
    fontSize: 24,
    fontWeight: "900",
    color: "#222",
    letterSpacing: -0.5,
  },
  ctaBtnBuy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaBtnPurchased: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
});
