// src/features/education/components/LectureCard.tsx
// ─── Individual lecture row for course detail screen ─────────────────────────

import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Lecture } from "../types/course";

interface LectureCardProps {
  lecture: Lecture;
  isLocked: boolean;
  isCompleted: boolean;
  isCurrentlyPlaying: boolean;
  onPress: () => void;
}

const GREEN = "#196F1B";
const BLUE = "#0D47A1";

export default function LectureCard({
  lecture,
  isLocked,
  isCompleted,
  isCurrentlyPlaying,
  onPress,
}: LectureCardProps) {
  const formatDuration = (mins: number) => `${mins} min`;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isCurrentlyPlaying && styles.containerActive,
        isLocked && styles.containerLocked,
      ]}
      onPress={onPress}
      activeOpacity={isLocked ? 0.5 : 0.7}
    >
      {/* Lecture number circle */}
      <View
        style={[
          styles.numberCircle,
          isCompleted && styles.numberCircleCompleted,
          isCurrentlyPlaying && styles.numberCircleActive,
          isLocked && styles.numberCircleLocked,
        ]}
      >
        {isCompleted ? (
          <Ionicons name="checkmark" size={16} color="#fff" />
        ) : (
          <Text
            style={[
              styles.numberText,
              isCurrentlyPlaying && styles.numberTextActive,
              isLocked && styles.numberTextLocked,
            ]}
          >
            {lecture.order}
          </Text>
        )}
      </View>

      {/* Lecture info */}
      <View style={styles.infoWrap}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              isLocked && styles.titleLocked,
            ]}
            numberOfLines={2}
          >
            {lecture.title}
          </Text>
          {lecture.isFree && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Ionicons
            name="time-outline"
            size={13}
            color={isLocked ? "#bbb" : "#888"}
          />
          <Text style={[styles.duration, isLocked && styles.durationLocked]}>
            {formatDuration(lecture.duration)}
          </Text>
        </View>
      </View>

      {/* Action icon */}
      <View style={styles.actionWrap}>
        {isLocked ? (
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={18} color="#ccc" />
          </View>
        ) : isCurrentlyPlaying ? (
          <View style={styles.playingIcon}>
            <Ionicons name="volume-high" size={18} color={BLUE} />
          </View>
        ) : (
          <View style={styles.playIcon}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  containerActive: {
    borderColor: BLUE,
    backgroundColor: "#F0F7FF",
    borderWidth: 1.5,
  },
  containerLocked: {
    opacity: 0.7,
    backgroundColor: "#FAFAFA",
  },

  numberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  numberCircleCompleted: {
    backgroundColor: GREEN,
  },
  numberCircleActive: {
    backgroundColor: "#E3F2FD",
  },
  numberCircleLocked: {
    backgroundColor: "#F0F0F0",
  },
  numberText: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN,
  },
  numberTextActive: {
    color: BLUE,
  },
  numberTextLocked: {
    color: "#bbb",
  },

  infoWrap: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
    flex: 1,
  },
  titleLocked: {
    color: "#999",
  },

  freeBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: 0.5,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  duration: {
    fontSize: 12,
    color: "#888",
  },
  durationLocked: {
    color: "#bbb",
  },

  actionWrap: {
    marginLeft: 4,
  },
  playIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  playingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
});
