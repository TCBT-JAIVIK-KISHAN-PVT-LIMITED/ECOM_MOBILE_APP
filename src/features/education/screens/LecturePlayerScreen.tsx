// src/features/education/screens/LecturePlayerScreen.tsx
// ─── Lecture video player screen ─────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import WebView from "react-native-webview";
import { useDispatch, useSelector } from "react-redux";
import * as ScreenOrientation from "expo-screen-orientation";

import { getCourseById } from "../data/courses";
import { fetchLectureWatchUrl } from "../services/education.api";
import {
  markLectureComplete,
  setLastWatched,
  selectCourseProgress,
} from "../store/educationSlice";
import type { RootState } from "../../../store/store";
import type { Lecture } from "../types/course";

const { width } = Dimensions.get("window");
const VIDEO_HEIGHT = (width * 9) / 16; // 16:9 aspect ratio
const GREEN = "#196F1B";
const BLUE = "#0D47A1";

export default function LecturePlayerScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const params = useLocalSearchParams<{ courseId: string; lectureId: string }>();
  const { courseId, lectureId } = params;

  const course = getCourseById(courseId || "");
  const lecture = course?.lectures.find((l) => l.id === lectureId);
  const currentIndex = course?.lectures.findIndex((l) => l.id === lectureId) ?? -1;
  const prevLecture = currentIndex > 0 ? course?.lectures[currentIndex - 1] : null;
  const nextLecture =
    currentIndex < (course?.lectures.length ?? 0) - 1
      ? course?.lectures[currentIndex + 1]
      : null;

  const progress = useSelector((state: RootState) =>
    selectCourseProgress(state, courseId || "")
  );
  const isCompleted =
    progress?.completedLectures.includes(lectureId || "") ?? false;

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Mark as last watched on mount
  useEffect(() => {
    if (courseId && lectureId) {
      dispatch(setLastWatched({ courseId, lectureId }));
    }
  }, [courseId, lectureId, dispatch]);

  // Fetch dynamic streaming URL from NestJS / Zoho WorkDrive
  useEffect(() => {
    let isMounted = true;
    async function loadStream() {
      if (!lectureId) return;
      setIsFetchingUrl(true);
      setAccessError(null);
      try {
        const res = await fetchLectureWatchUrl(lectureId, courseId);
        if (isMounted && res?.videoUrl) {
          setStreamUrl(res.videoUrl);
        }
      } catch (err: any) {
        if (err?.status === 403 || err?.status === 401) {
          if (isMounted) {
            setAccessError(
              err.message ||
                "कृपया इस व्याख्यान को देखने के लिए पाठ्यक्रम खरीदें।"
            );
          }
        } else {
          // Dev / offline mode fallback
          if (isMounted && lecture?.videoUrl) {
            setStreamUrl(lecture.videoUrl);
          }
        }
      } finally {
        if (isMounted) setIsFetchingUrl(false);
      }
    }

    loadStream();
    return () => {
      isMounted = false;
    };
  }, [lectureId, courseId, lecture]);

  // Fade in content
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Reset orientation to portrait when leaving screen
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    };
  }, []);

  // ─── Handle fullscreen messages from WebView JS ────────────────────────
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "fullscreenChange") {
        if (data.isFullscreen) {
          setIsFullscreen(true);
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE
          );
        } else {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
          setIsFullscreen(false);
        }
      }
    } catch {}
  }, []);

  const handleMarkComplete = useCallback(() => {
    if (courseId && lectureId) {
      dispatch(markLectureComplete({ courseId, lectureId }));
    }
  }, [courseId, lectureId, dispatch]);

  const navigateToLecture = useCallback(
    (targetLecture: Lecture) => {
      router.replace({
        pathname: "/education/lecture",
        params: {
          courseId: courseId || "",
          lectureId: targetLecture.id,
        },
      } as any);
    },
    [courseId]
  );

  if (!course || !lecture) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Lecture not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active playback video URL
  const activeVideoUrl = streamUrl || lecture.videoUrl;

  // Build HTML for video player — includes fullscreen detection
  const videoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-user-select: none; user-select: none; }
        body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
          -webkit-touch-callout: none;
          pointer-events: auto;
        }
        /* Hide download button in Chrome-based browsers */
        video::-internal-media-controls-download-button { display: none; }
        video::-webkit-media-controls-enclosure { overflow: hidden; }
        video::-webkit-media-controls-panel { width: calc(100% + 30px); }
      </style>
    </head>
    <body>
      <video
        id="player"
        controls
        autoplay
        playsinline
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        oncontextmenu="return false;"
        src="${activeVideoUrl}"
        poster=""
      >
        Your browser does not support the video tag.
      </video>
      <script>
        // Block context menu / drag / multi-touch
        document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
        document.addEventListener('dragstart', function(e) { e.preventDefault(); return false; });
        document.addEventListener('touchstart', function(e) {
          if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });

        // Notify React Native when fullscreen is entered/exited
        function onFullscreenChange() {
          var isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'fullscreenChange',
            isFullscreen: isFS
          }));
        }
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, !isFullscreen && { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" hidden={isFullscreen} />

      {/* ── Video Player ── */}
      <View style={[styles.videoContainer, isFullscreen && styles.videoFullscreen]}>
        {accessError ? (
          <View style={styles.accessErrorContainer}>
            <View style={styles.lockIconWrap}>
              <Ionicons name="lock-closed" size={32} color="#fff" />
            </View>
            <Text style={styles.accessErrorTitle}>प्रीमियम व्याख्यान (Locked)</Text>
            <Text style={styles.accessErrorSub}>{accessError}</Text>
            <TouchableOpacity
              style={styles.unlockBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="cart" size={16} color="#fff" />
              <Text style={styles.unlockBtnText}>कोर्स अनलॉक करें</Text>
            </TouchableOpacity>
          </View>
        ) : isFetchingUrl ? (
          <View style={styles.videoLoader}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.videoLoaderText}>
              Connecting to Zoho WorkDrive...
            </Text>
          </View>
        ) : (
          <>
            {videoLoading && (
              <View style={styles.videoLoader}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.videoLoaderText}>Loading video...</Text>
              </View>
            )}
            <WebView
              key={activeVideoUrl}
              source={{ html: videoHtml }}
              style={styles.webview}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              onLoadEnd={() => setVideoLoading(false)}
              onMessage={handleWebViewMessage}
            />
          </>
        )}
      </View>

      {/* ── Header bar (hidden in fullscreen) ── */}
      {!isFullscreen && (
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerLecture} numberOfLines={1}>
              Lecture {lecture.order} of {course.lectures.length}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.completeBtn,
              isCompleted && styles.completeBtnDone,
            ]}
            onPress={handleMarkComplete}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
              size={22}
              color={isCompleted ? "#fff" : GREEN}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Lecture Details (hidden in fullscreen) ── */}
      {!isFullscreen && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Title section */}
            <View style={styles.titleSection}>
              <View style={styles.titleBadgeRow}>
                <View style={styles.lectureBadge}>
                  <Text style={styles.lectureBadgeText}>
                    LECTURE {lecture.order}
                  </Text>
                </View>
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={12} color="#666" />
                  <Text style={styles.durationText}>{lecture.duration} min</Text>
                </View>
                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                    <Text style={styles.completedBadgeText}>Completed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.lectureTitle}>{lecture.title}</Text>
              <Text style={styles.lectureDescription}>{lecture.description}</Text>
            </View>

            {/* Navigation buttons */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.navBtn, !prevLecture && styles.navBtnDisabled]}
                onPress={() => prevLecture && navigateToLecture(prevLecture)}
                disabled={!prevLecture}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={prevLecture ? GREEN : "#ccc"}
                />
                <Text
                  style={[
                    styles.navBtnText,
                    !prevLecture && styles.navBtnTextDisabled,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              {!isCompleted && (
                <TouchableOpacity
                  style={styles.markCompleteBtn}
                  onPress={handleMarkComplete}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.markCompleteText}>Mark Complete</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.navBtn, !nextLecture && styles.navBtnDisabled]}
                onPress={() => nextLecture && navigateToLecture(nextLecture)}
                disabled={!nextLecture}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.navBtnText,
                    !nextLecture && styles.navBtnTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={nextLecture ? GREEN : "#ccc"}
                />
              </TouchableOpacity>
            </View>

            {/* All lectures quick nav */}
            <View style={styles.allLecturesSection}>
              <Text style={styles.allLecturesTitle}>All Lectures</Text>
              {course.lectures.map((l) => {
                const isCurrent = l.id === lectureId;
                const lCompleted =
                  progress?.completedLectures.includes(l.id) ?? false;

                return (
                  <TouchableOpacity
                    key={l.id}
                    style={[
                      styles.allLectureRow,
                      isCurrent && styles.allLectureRowActive,
                    ]}
                    onPress={() => {
                      if (!isCurrent) navigateToLecture(l);
                    }}
                    activeOpacity={isCurrent ? 1 : 0.7}
                  >
                    <View
                      style={[
                        styles.allLectureNum,
                        isCurrent && styles.allLectureNumActive,
                        lCompleted && styles.allLectureNumCompleted,
                      ]}
                    >
                      {lCompleted ? (
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.allLectureNumText,
                            isCurrent && styles.allLectureNumTextActive,
                          ]}
                        >
                          {l.order}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.allLectureTitle,
                        isCurrent && styles.allLectureTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {l.title}
                    </Text>
                    <Text style={styles.allLectureDur}>{l.duration}m</Text>
                    {isCurrent && (
                      <Ionicons name="volume-high" size={14} color={BLUE} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
  },
  errorLink: {
    fontSize: 14,
    color: GREEN,
    fontWeight: "700",
  },

  // ── Video ──
  videoContainer: {
    width: "100%",
    height: VIDEO_HEIGHT,
    backgroundColor: "#000",
  },
  videoFullscreen: {
    flex: 1,
    height: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoLoader: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  videoLoaderText: {
    color: "#888",
    fontSize: 12,
    marginTop: 8,
  },
  accessErrorContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    padding: 24,
  },
  lockIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  accessErrorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
    textAlign: "center",
  },
  accessErrorSub: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GREEN,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  unlockBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Header bar ──
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8E8E8",
    backgroundColor: "#fff",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerLecture: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  completeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnDone: {
    backgroundColor: GREEN,
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Title section ──
  titleSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  titleBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  lectureBadge: {
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lectureBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: BLUE,
    letterSpacing: 0.5,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  lectureTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  lectureDescription: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    letterSpacing: 0.15,
  },

  // ── Navigation ──
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  navBtnDisabled: {
    borderColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  navBtnTextDisabled: {
    color: "#ccc",
  },
  markCompleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  markCompleteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  // ── All lectures ──
  allLecturesSection: {
    padding: 16,
  },
  allLecturesTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
    marginBottom: 12,
  },
  allLectureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 10,
  },
  allLectureRowActive: {
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: "#D0E4FF",
  },
  allLectureNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  allLectureNumActive: {
    backgroundColor: "#E3F2FD",
  },
  allLectureNumCompleted: {
    backgroundColor: GREEN,
  },
  allLectureNumText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
  },
  allLectureNumTextActive: {
    color: BLUE,
  },
  allLectureTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#444",
  },
  allLectureTitleActive: {
    fontWeight: "700",
    color: BLUE,
  },
  allLectureDur: {
    fontSize: 11,
    color: "#aaa",
    fontWeight: "500",
  },
});
