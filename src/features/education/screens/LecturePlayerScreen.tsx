// src/features/education/screens/LecturePlayerScreen.tsx
// ─── Lecture video player screen ─────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
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
import { fetchLectureWatchUrl, fetchCourseLectures } from "../services/education.api";
import {
  markLectureComplete,
  setLastWatched,
  selectCourseProgress,
  selectIsPurchased,
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

  const baseCourse = getCourseById(courseId || "");
  const [courseLectures, setCourseLectures] = useState<Lecture[]>(
    baseCourse?.lectures || []
  );

  useEffect(() => {
    let isMounted = true;
    async function loadDynamicLectures() {
      try {
        const res = await fetchCourseLectures(courseId || "");
        if (isMounted && res?.lectures?.length) {
          setCourseLectures(res.lectures);
        }
      } catch {}
    }
    loadDynamicLectures();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const course = baseCourse;
  const lecture = courseLectures.find((l) => l.id === lectureId);
  const currentIndex = courseLectures.findIndex((l) => l.id === lectureId) ?? -1;
  const prevLecture = currentIndex > 0 ? courseLectures[currentIndex - 1] : null;
  const nextLecture =
    currentIndex < (courseLectures.length ?? 0) - 1
      ? courseLectures[currentIndex + 1]
      : null;

  const progress = useSelector((state: RootState) =>
    selectCourseProgress(state, courseId || "")
  );
  const isPurchased = useSelector((state: RootState) =>
    selectIsPurchased(state, courseId || "")
  );
  const isCompleted =
    progress?.completedLectures.includes(lectureId || "") ?? false;

  const nextIsLocked = Boolean(nextLecture && !nextLecture.isFree && !isPurchased);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Helper to format duration into hours and minutes
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  // Mark as last watched on mount
  useEffect(() => {
    if (courseId && lectureId) {
      dispatch(setLastWatched({ courseId, lectureId }));
    }
  }, [courseId, lectureId, dispatch]);

  // Fetch dynamic streaming URL from NestJS / Cloudflare R2
  useEffect(() => {
    let isMounted = true;
    async function loadStream() {
      if (!lectureId || !course || !lecture) return;

      // Access Control: Block paid lectures if course not purchased
      if (!lecture.isFree && !isPurchased) {
        if (isMounted) {
          setIsFetchingUrl(false);
          setStreamUrl(null);
          setAccessError(
            "यह एक प्रीमियम व्याख्यान है। कृपया सभी व्याख्यान देखने के लिए पूरा पाठ्यक्रम खरीदें।"
          );
        }
        return;
      }

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
          // Dev / offline mode fallback ONLY if lecture is free or purchased
          if (isMounted && (lecture.isFree || isPurchased) && lecture?.videoUrl) {
            setStreamUrl(lecture.videoUrl);
          } else if (isMounted) {
            setAccessError(
              "कृपया इस व्याख्यान को देखने के लिए पाठ्यक्रम खरीदें।"
            );
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
  }, [lectureId, courseId, lecture, course, isPurchased]);

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

  // ─── Handle messages from WebView JS ───────────────────────────────────
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "loadedmetadata" && data.durationMinutes) {
        setActualDuration(data.durationMinutes);
      }
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

  const handleBuyNow = useCallback(async () => {
    const educationUrl = "https://www.tcbtjaivikkisan.com/education";
    try {
      await Linking.openURL(educationUrl);
    } catch {
      Alert.alert(
        "Error",
        `Unable to open course page. Please visit ${educationUrl}`
      );
    }
  }, []);

  const navigateToLecture = useCallback(
    (targetLecture: Lecture) => {
      const isTargetLocked = !targetLecture.isFree && !isPurchased;
      if (isTargetLocked) {
        Alert.alert(
          "🔒 Premium Content",
          `व्याख्यान ${targetLecture.order} प्रीमियम सामग्री है। इसे देखने के लिए कृपया पाठ्यक्रम खरीदें।`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Buy Course", onPress: handleBuyNow },
          ]
        );
        return;
      }

      router.replace({
        pathname: "/education/lecture",
        params: {
          courseId: courseId || "",
          lectureId: targetLecture.id,
        },
      } as any);
    },
    [courseId, isPurchased, handleBuyNow]
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
  const activeVideoUrl = streamUrl || (lecture.isFree || isPurchased ? lecture.videoUrl : "");

  // Build HTML for video player with clean styling and tap-to-play
  const videoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body {
          width: 100%;
          height: 100%;
          background: #000;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .player-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }
        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
          outline: none;
        }
        video::-internal-media-controls-download-button { display: none !important; }
        video::-webkit-media-controls-download-button { display: none !important; }
        .play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.35);
          cursor: pointer;
          transition: opacity 0.2s ease;
          z-index: 5;
        }
        .play-overlay.hidden {
          opacity: 0;
          pointer-events: none;
        }
        .play-btn-circle {
          width: 64px;
          height: 64px;
          border-radius: 32px;
          background: rgba(25, 111, 27, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }
        .play-triangle {
          width: 0;
          height: 0;
          border-top: 12px solid transparent;
          border-bottom: 12px solid transparent;
          border-left: 20px solid #ffffff;
          margin-left: 4px;
        }
      </style>
    </head>
    <body>
      <div class="player-wrap">
        <video
          id="player"
          controls
          playsinline
          webkit-playsinline
          preload="metadata"
          controlsList="nodownload"
          disablePictureInPicture
        >
          <source src="${activeVideoUrl}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
        <div class="play-overlay" id="overlay" onclick="startPlay()">
          <div class="play-btn-circle">
            <div class="play-triangle"></div>
          </div>
        </div>
      </div>
      <script>
        const player = document.getElementById('player');
        const overlay = document.getElementById('overlay');

        function startPlay() {
          overlay.classList.add('hidden');
          player.play().catch(function(e) { console.log(e); });
        }

        player.addEventListener('loadedmetadata', function() {
          var durMins = Math.round(player.duration / 60);
          if (window.ReactNativeWebView && durMins > 0) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'loadedmetadata',
              durationMinutes: durMins,
              durationSeconds: player.duration
            }));
          }
          try {
            var saved = localStorage.getItem('tcbt_vid_pos_${lecture.id}');
            if (saved) {
              var pos = parseFloat(saved);
              if (pos > 5 && pos < player.duration - 15) {
                player.currentTime = pos;
              }
            }
          } catch(e) {}
        });

        player.addEventListener('timeupdate', function() {
          try {
            if (player.currentTime > 5) {
              localStorage.setItem('tcbt_vid_pos_${lecture.id}', player.currentTime.toString());
            }
          } catch(e) {}
        });

        player.addEventListener('play', function() {
          overlay.classList.add('hidden');
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'play' }));
          }
        });

        player.addEventListener('pause', function() {
          if (player.currentTime < 0.5) {
            overlay.classList.remove('hidden');
          }
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pause' }));
          }
        });

        player.addEventListener('ended', function() {
          overlay.classList.remove('hidden');
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
          }
        });

        function onFullscreenChange() {
          var isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'fullscreenChange',
              isFullscreen: isFS
            }));
          }
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
              onPress={handleBuyNow}
              activeOpacity={0.8}
            >
              <Ionicons name="cart" size={16} color="#fff" />
              <Text style={styles.unlockBtnText}>कोर्स अनलॉक करें (Buy Course)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unlockBtn, styles.backFromLockBtn]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={16} color="#aaa" />
              <Text style={styles.backFromLockText}>पीछे जाएँ (Go Back)</Text>
            </TouchableOpacity>
          </View>
        ) : isFetchingUrl ? (
          <View style={styles.videoLoader}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.videoLoaderText}>
              Loading lecture video...
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
              source={{
                html: videoHtml,
                baseUrl: "https://pub-b30bf5dcb5c54e619a24a0f7d1b2d91e.r2.dev/",
              }}
              style={styles.webview}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
              mixedContentMode="always"
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
              Lecture {lecture.order} of {courseLectures.length}
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
                {lecture.isFree && (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>FREE DEMO</Text>
                  </View>
                )}
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={12} color="#666" />
                  <Text style={styles.durationText}>
                    {formatDuration(actualDuration ?? lecture.duration)}
                  </Text>
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

              {/* Instructor attribution */}
              <View style={styles.playerInstructorRow}>
                <Image
                  source={require("@/assets/images/instructor_avatar.png")}
                  style={styles.playerInstructorAvatar}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerInstructorName}>
                    {course.instructor}
                  </Text>
                  {course.instructorTitle && (
                    <Text style={styles.playerInstructorTitle}>
                      {course.instructorTitle}
                    </Text>
                  )}
                </View>
              </View>
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
                style={[
                  styles.navBtn,
                  !nextLecture && styles.navBtnDisabled,
                  nextIsLocked && styles.navBtnLocked,
                ]}
                onPress={() => nextLecture && navigateToLecture(nextLecture)}
                disabled={!nextLecture}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.navBtnText,
                    !nextLecture && styles.navBtnTextDisabled,
                    nextIsLocked && styles.navBtnTextLocked,
                  ]}
                >
                  Next {nextIsLocked ? "🔒" : ""}
                </Text>
                <Ionicons
                  name={nextIsLocked ? "lock-closed" : "chevron-forward"}
                  size={nextIsLocked ? 14 : 18}
                  color={!nextLecture ? "#ccc" : nextIsLocked ? "#888" : GREEN}
                />
              </TouchableOpacity>
            </View>

            {/* All lectures quick nav */}
            <View style={styles.allLecturesSection}>
              <Text style={styles.allLecturesTitle}>All Lectures</Text>
              {courseLectures.map((l) => {
                const isCurrent = l.id === lectureId;
                const lLocked = !l.isFree && !isPurchased;
                const lCompleted =
                  progress?.completedLectures.includes(l.id) ?? false;

                return (
                  <TouchableOpacity
                    key={l.id}
                    style={[
                      styles.allLectureRow,
                      isCurrent && styles.allLectureRowActive,
                      lLocked && styles.allLectureRowLocked,
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
                        lLocked && styles.allLectureNumLocked,
                      ]}
                    >
                      {lCompleted ? (
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      ) : lLocked ? (
                        <Ionicons name="lock-closed" size={12} color="#888" />
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
                    <View style={styles.allLectureTitleWrap}>
                      <Text
                        style={[
                          styles.allLectureTitle,
                          isCurrent && styles.allLectureTitleActive,
                          lLocked && styles.allLectureTitleLocked,
                        ]}
                        numberOfLines={1}
                      >
                        {l.title}
                      </Text>
                      {l.isFree && (
                        <View style={styles.freePill}>
                          <Text style={styles.freePillText}>FREE</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.allLectureDur,
                        lLocked && styles.allLectureDurLocked,
                      ]}
                    >
                      {formatDuration(l.duration)}
                    </Text>
                    {isCurrent ? (
                      <Ionicons name="volume-high" size={14} color={BLUE} />
                    ) : lLocked ? (
                      <Ionicons name="lock-closed-outline" size={14} color="#bbb" />
                    ) : null}
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
  backFromLockBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#444",
    marginTop: 8,
  },
  backFromLockText: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "600",
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
  playerInstructorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  playerInstructorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    borderWidth: 1.5,
    borderColor: "#A5D6A7",
  },
  playerInstructorName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  playerInstructorTitle: {
    fontSize: 11,
    color: GREEN,
    fontWeight: "500",
    marginTop: 1,
  },
  titleBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
    alignItems: "center",
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
  freeBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: GREEN,
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
  navBtnLocked: {
    borderColor: "#E5E5E5",
    backgroundColor: "#F9F9F9",
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  navBtnTextDisabled: {
    color: "#ccc",
  },
  navBtnTextLocked: {
    color: "#777",
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
  allLectureRowLocked: {
    backgroundColor: "#FAFAFA",
    opacity: 0.8,
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
  allLectureNumLocked: {
    backgroundColor: "#EFEFEF",
  },
  allLectureNumText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
  },
  allLectureNumTextActive: {
    color: BLUE,
  },
  allLectureTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  allLectureTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#444",
  },
  allLectureTitleActive: {
    fontWeight: "700",
    color: BLUE,
  },
  allLectureTitleLocked: {
    color: "#888",
  },
  allLectureDur: {
    fontSize: 11,
    color: "#aaa",
    fontWeight: "500",
  },
  allLectureDurLocked: {
    color: "#bbb",
  },
  freePill: {
    backgroundColor: "#E8F5E9",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  freePillText: {
    fontSize: 9,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: 0.5,
  },
});

