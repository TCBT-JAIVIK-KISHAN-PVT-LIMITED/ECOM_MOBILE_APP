import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSelector } from "../../../shared/hooks/useRedux";
import {
  fetchReferralLeaderboard,
  type ReferralDashboardResponse,
} from "../services/referral.api";

const GREEN_PRIMARY = "#196F1B";
const GREEN_DARK = "#0F5A14";
const GOLD = "#FFB700";
const WHATSAPP_GREEN = "#25D366";
const SUPPORT_PHONE_DISPLAY = "+91 88712 71446";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.tcbt.jaivikkisan";

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "Ending soon";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m left`;
  return `${hours}h ${mins}m left`;
}

export default function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state) => state.user);
  const [data, setData] = useState<ReferralDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const fallbackCode = React.useMemo(() => {
    if (!user.userId && !user.phone) return "";
    const digits = (user.phone || "").replace(/\D/g, "").slice(-4) || "2026";
    const idTail = (user.userId || "").slice(-2).toUpperCase() || "JK";
    return `TCBT${idTail}${digits}`;
  }, [user.userId, user.phone]);

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        const res = await fetchReferralLeaderboard(user.userId);
        setData(res);
        setSecondsLeft(res.current_week?.seconds_remaining ?? 0);
      } catch (err: any) {
        console.warn("[ReferralScreen] Leaderboard fetch warning:", err?.message);
        // Provide graceful fallback state if backend server hasn't been restarted yet
        setData((prev) =>
          prev ?? {
            prize: {
              title: "1 Bag of Govardhan Khanij Khad FREE",
              title_hi: "1 बोरी गोवर्धन खनिज खाद बिल्कुल मुफ़्त!",
              description:
                "Refer the most farmer friends this week (Monday to Sunday) & win 1 bag of Govardhan Khanij Khad free!",
              description_hi:
                "हर हफ्ते (सोमवार से रविवार) सबसे ज़्यादा किसान मित्रों को ऐप रेफर करने वाले विजेता को मिलेगी 1 बोरी गोवर्धन खनिज खाद बिल्कुल मुफ़्त!",
            },
            current_week: {
              week_key: "Current Week",
              week_start: new Date().toISOString(),
              week_end: new Date().toISOString(),
              label: "Mon – Sun",
              seconds_remaining: 3 * 86400,
            },
            me:
              user.isLoggedIn || Boolean(user.userId)
                ? {
                    user_id: user.userId || "",
                    referral_code: fallbackCode,
                    weekly_referrals: 0,
                    total_referrals: 0,
                    current_rank: null,
                    already_referred: false,
                    won_week: null,
                  }
                : null,
            leaderboard: [],
            last_week_winner: null,
            recent_winners: [],
            my_referred_friends: [],
          }
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user.userId, user.isLoggedIn, fallbackCode]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 60 : 0));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const myCode = data?.me?.referral_code || fallbackCode;

  const buildShareMessage = useCallback(() => {
    const codePart = myCode
      ? `\n\n🎁 मेरा रेफरल कोड (My Referral Code): *${myCode}*`
      : "";
    return (
      `🌿 *TCBT जैविक किसान ऐप* से जुड़ें!\n` +
      `100% शुद्ध जैविक खाद, गोवर्धन खनिज खाद और प्राकृतिक खेती प्रशिक्षण पाएँ।` +
      codePart +
      `\n\n📲 अभी ऐप डाउनलोड करें और साइनअप करते समय मेरा कोड डालें:\n${PLAY_STORE_URL}`
    );
  }, [myCode]);

  const handleShareWhatsApp = useCallback(async () => {
    if (!user.isLoggedIn && !user.userId) {
      router.push("/auth/login" as any);
      return;
    }
    const text = buildShareMessage();
    const waUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const canOpen = await Linking.canOpenURL(waUrl);
      if (canOpen) {
        await Linking.openURL(waUrl);
      } else {
        await Share.share({ message: text });
      }
    } catch {
      await Share.share({ message: text });
    }
  }, [user.isLoggedIn, user.userId, buildShareMessage]);

  const handleNativeShare = useCallback(async () => {
    if (!user.isLoggedIn && !user.userId) {
      router.push("/auth/login" as any);
      return;
    }
    try {
      await Share.share({ message: buildShareMessage() });
    } catch {}
  }, [user.isLoggedIn, user.userId, buildShareMessage]);

  const handleContactSupportWinner = useCallback(() => {
    const msg = encodeURIComponent(
      `नमस्ते TCBT टीम! मैं साप्ताहिक रेफरल प्रतियोगिता का विजेता हूँ (Code: ${myCode || "TCBT"})। कृपया मेरी 1 बोरी गोवर्धन खनिज खाद के लिए मार्गदर्शन करें।`
    );
    Linking.openURL(`https://wa.me/918871271446?text=${msg}`);
  }, [myCode]);

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* Top Header */}
      <LinearGradient
        colors={[GREEN_DARK, GREEN_PRIMARY]}
        style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>रेफर करें और खाद जीतें</Text>
          <Text style={styles.headerSub}>Weekly Referral Leaderboard</Text>
        </View>
        <TouchableOpacity
          onPress={() => loadData(true)}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={GREEN_PRIMARY} />
          <Text style={styles.loaderText}>Loading weekly leaderboard...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData(true);
              }}
              colors={[GREEN_PRIMARY]}
            />
          }
        >
          {/* ── Grand Prize Hero Banner ── */}
          <LinearGradient
            colors={["#1B5E20", "#2E7D32", "#196F1B"]}
            style={styles.heroBanner}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.weeklyPill}>
                <Ionicons name="trophy" size={14} color="#78350F" />
                <Text style={styles.weeklyPillText}>
                  साप्ताहिक पुरस्कार • WEEKLY PRIZE
                </Text>
              </View>
              {data?.current_week && (
                <View style={styles.timerPill}>
                  <Ionicons name="time-outline" size={13} color="#fff" />
                  <Text style={styles.timerPillText}>
                    {formatRemainingTime(secondsLeft)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.heroHindiTitle}>
              हर हफ्ते सबसे ज़्यादा रेफर करने वाले को मिलेगा
            </Text>
            <View style={styles.prizeHighlightBox}>
              <Text style={styles.prizeHighlightEmoji}>🌾</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.prizeHighlightMain}>
                  1 बोरी गोवर्धन खनिज खाद FREE!
                </Text>
                <Text style={styles.prizeHighlightSub}>
                  1 Bag of Govardhan Khanij Khad Free Every Week
                </Text>
              </View>
            </View>

            <Text style={styles.heroRulesNote}>
              📅 सप्ताह: सोमवार से रविवार ({data?.current_week?.label || "Mon – Sun"}) •
              विजेता से हमारी टीम सोमवार को फोन/WhatsApp पर संपर्क करेगी।
            </Text>
          </LinearGradient>

          {/* ── Winner Congratulations Banner (if current user won) ── */}
          {data?.me?.won_week && (
            <View style={styles.congratsCard}>
              <View style={styles.congratsHeader}>
                <Text style={styles.congratsEmoji}>🎉🏆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.congratsTitle}>
                    बधाई हो! आप विजेता हैं! (Congratulations!)
                  </Text>
                  <Text style={styles.congratsSub}>
                    You won {data.me.won_week.prize_name} ({data.me.won_week.week_key}) with{" "}
                    {data.me.won_week.referral_count} referrals!
                  </Text>
                </View>
              </View>
              <Text style={styles.congratsNotice}>
                हमारी टीम आपसे जल्द ही फोन/WhatsApp पर संपर्क करेगी, या आप नीचे बटन दबाकर
                सीधे सहायता टीम को संदेश भेज सकते हैं:
              </Text>
              <TouchableOpacity
                style={styles.congratsWaBtn}
                onPress={handleContactSupportWinner}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={styles.congratsWaText}>
                  WhatsApp Support ({SUPPORT_PHONE_DISPLAY})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── My Referral Code & Share Card ── */}
          <View style={styles.card}>
            {user.isLoggedIn || Boolean(user.userId) ? (
              <>
                <Text style={styles.sectionHeading}>
                  आपका रेफरल कोड (Your Referral Code)
                </Text>
                <Text style={styles.sectionSub}>
                  अपने किसान मित्रों को WhatsApp पर शेयर करें। जब वे नया अकाउंट बनाकर आपका कोड
                  डालेंगे, आपकी साप्ताहिक गिनती बढ़ जाएगी!
                </Text>

                <View style={styles.codeBox}>
                  <View>
                    <Text style={styles.codeLabel}>REFERRAL CODE</Text>
                    <Text style={styles.codeValue}>{myCode}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={handleNativeShare}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={18}
                      color={GREEN_PRIMARY}
                    />
                    <Text style={styles.copyBtnText}>Share Code</Text>
                  </TouchableOpacity>
                </View>

                {/* Share on WhatsApp CTA */}
                <TouchableOpacity
                  style={styles.waShareBtn}
                  onPress={handleShareWhatsApp}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                  <Text style={styles.waShareBtnText}>
                    WhatsApp पर किसान मित्रों को भेजें
                  </Text>
                </TouchableOpacity>

                {/* My Weekly Stats Strip */}
                <View style={styles.myStatsRow}>
                  <View style={styles.myStatBox}>
                    <Text style={styles.myStatNum}>
                      {data?.me?.weekly_referrals ?? 0}
                    </Text>
                    <Text style={styles.myStatLabel}>इस हफ्ते रेफरल</Text>
                    <Text style={styles.myStatSub}>This Week</Text>
                  </View>
                  <View style={styles.myStatDivider} />
                  <View style={styles.myStatBox}>
                    <Text style={[styles.myStatNum, { color: "#D97706" }]}>
                      {data?.me?.current_rank ? `#${data.me.current_rank}` : "—"}
                    </Text>
                    <Text style={styles.myStatLabel}>आपकी रैंक</Text>
                    <Text style={styles.myStatSub}>Weekly Rank</Text>
                  </View>
                  <View style={styles.myStatDivider} />
                  <View style={styles.myStatBox}>
                    <Text style={styles.myStatNum}>
                      {data?.me?.total_referrals ?? 0}
                    </Text>
                    <Text style={styles.myStatLabel}>कुल रेफरल</Text>
                    <Text style={styles.myStatSub}>All Time</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.guestPrompt}>
                <Text style={styles.guestPromptEmoji}>🌾</Text>
                <Text style={styles.guestPromptTitle}>
                  अपना रेफरल कोड पाने के लिए लॉगिन करें
                </Text>
                <Text style={styles.guestPromptSub}>
                  Sign in with your mobile number to get your referral code and win 1 bag of Govardhan Khanij Khad free!
                </Text>
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => router.push("/auth/login" as any)}
                >
                  <Text style={styles.loginBtnText}>लॉगिन करें (Sign In)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Last Week's Winner Card ── */}
          {data?.last_week_winner && (
            <View style={styles.lastWinnerCard}>
              <View style={styles.lastWinnerBadgeRow}>
                <Text style={styles.lastWinnerCrown}>👑</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lastWinnerLabel}>
                    पिछले सप्ताह के विजेता • LAST WEEK WINNER ({data.last_week_winner.week_label})
                  </Text>
                  <Text style={styles.lastWinnerName}>
                    {data.last_week_winner.winner_name}{" "}
                    <Text style={styles.lastWinnerMobile}>
                      ({data.last_week_winner.masked_mobile})
                    </Text>
                  </Text>
                  <Text style={styles.lastWinnerPrize}>
                    🎁 पुरस्कार: 1 बोरी गोवर्धन खनिज खाद ({data.last_week_winner.referral_count}{" "}
                    रेफरल)
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Live Weekly Leaderboard ── */}
          <View style={styles.card}>
            <View style={styles.leaderboardHeader}>
              <View>
                <Text style={styles.sectionHeading}>
                  🏆 इस सप्ताह का लीडरबोर्ड (Top Referrers)
                </Text>
                <Text style={styles.leaderboardSub}>
                  {data?.current_week?.label || "This Week"} • #1 किसान को मिलेगी मुफ़्त खाद
                </Text>
              </View>
            </View>

            {!data?.leaderboard || data.leaderboard.length === 0 ? (
              <View style={styles.emptyBoard}>
                <Text style={styles.emptyBoardEmoji}>🚀</Text>
                <Text style={styles.emptyBoardTitle}>
                  इस हफ्ते अभी तक कोई रेफरल नहीं हुआ है!
                </Text>
                <Text style={styles.emptyBoardSub}>
                  अभी अपने मित्रों को रेफर करें और #1 स्थान पर पहुँचकर गोवर्धन खनिज खाद जीतें!
                </Text>
              </View>
            ) : (
              data.leaderboard.map((item) => {
                const isTop1 = item.rank === 1;
                const isTop2 = item.rank === 2;
                const isTop3 = item.rank === 3;
                const medal = isTop1
                  ? "🥇"
                  : isTop2
                  ? "🥈"
                  : isTop3
                  ? "🥉"
                  : `#${item.rank}`;

                return (
                  <View
                    key={item.user_id}
                    style={[
                      styles.leaderRow,
                      isTop1 && styles.leaderRowFirst,
                      item.is_me && styles.leaderRowMe,
                    ]}
                  >
                    <View style={styles.rankBadge}>
                      <Text
                        style={[
                          styles.rankText,
                          (isTop1 || isTop2 || isTop3) && styles.rankMedalText,
                        ]}
                      >
                        {medal}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.leaderNameRow}>
                        <Text style={styles.leaderName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.is_me && (
                          <View style={styles.youTag}>
                            <Text style={styles.youTagText}>आप (You)</Text>
                          </View>
                        )}
                        {isTop1 && (
                          <View style={styles.winningTag}>
                            <Text style={styles.winningTagText}>
                              Winning Free Khad 🌾
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.leaderMobile}>
                        {item.masked_mobile}
                      </Text>
                    </View>

                    <View style={styles.countPill}>
                      <Text style={styles.countNum}>{item.referral_count}</Text>
                      <Text style={styles.countUnit}>रेफरल</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ── My Referred Friends This Week ── */}
          {user.isLoggedIn &&
            data?.my_referred_friends &&
            data.my_referred_friends.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionHeading}>
                  आपके द्वारा जोड़े गए किसान मित्र ({data.my_referred_friends.length})
                </Text>
                {data.my_referred_friends.map((friend) => (
                  <View key={friend.id} style={styles.friendRow}>
                    <View style={styles.friendAvatar}>
                      <Ionicons
                        name="person"
                        size={16}
                        color={GREEN_PRIMARY}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={styles.friendMobile}>
                        {friend.masked_mobile}
                      </Text>
                    </View>
                    {friend.is_current_week && (
                      <View style={styles.thisWeekTag}>
                        <Text style={styles.thisWeekTagText}>इस सप्ताह (+1)</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

          {/* ── How It Works Card ── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>
              कैसे काम करता है? (How It Works)
            </Text>
            <View style={styles.stepRow}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>
                  WhatsApp पर कोड शेयर करें
                </Text>
                <Text style={styles.stepDesc}>
                  ऊपर दिए गए हरे बटन से अपना रेफरल कोड अपने किसान मित्रों और WhatsApp ग्रुप में भेजें।
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>
                  मित्र ऐप में साइनअप करके आपका कोड डालें
                </Text>
                <Text style={styles.stepDesc}>
                  जैसे ही आपके मित्र OTP से लॉगिन करके आपका कोड डालेंगे, लीडरबोर्ड पर आपका स्कोर +1 बढ़ जाएगा।
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>
                  रविवार रात #1 किसान बनेगा विजेता!
                </Text>
                <Text style={styles.stepDesc}>
                  हर सप्ताह (सोमवार–रविवार) सबसे अधिक रेफरल करने वाले किसान को हमारी टीम फोन/WhatsApp द्वारा संपर्क कर 1 बोरी गोवर्धन खनिज खाद मुफ़्त भेजेगी।
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 10,
    color: "#555",
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  weeklyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  weeklyPillText: {
    color: "#78350F",
    fontSize: 11,
    fontWeight: "800",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  timerPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  heroHindiTitle: {
    color: "#E8F5E9",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  prizeHighlightBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,183,0,0.5)",
    gap: 12,
    marginBottom: 10,
  },
  prizeHighlightEmoji: {
    fontSize: 34,
  },
  prizeHighlightMain: {
    color: "#FFD54F",
    fontSize: 19,
    fontWeight: "900",
  },
  prizeHighlightSub: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  heroRulesNote: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    lineHeight: 17,
  },
  congratsCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
  },
  congratsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  congratsEmoji: {
    fontSize: 28,
  },
  congratsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#92400E",
  },
  congratsSub: {
    fontSize: 13,
    color: "#B45309",
    marginTop: 2,
  },
  congratsNotice: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 18,
    marginBottom: 12,
  },
  congratsWaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHATSAPP_GREEN,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
  },
  congratsWaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1D1F",
  },
  sectionSub: {
    fontSize: 13,
    color: "#5E646A",
    marginTop: 4,
    lineHeight: 19,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F5E9",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: GREEN_PRIMARY,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 14,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E7D32",
    letterSpacing: 0.8,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: "900",
    color: GREEN_DARK,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    gap: 6,
  },
  copyBtnText: {
    color: GREEN_PRIMARY,
    fontWeight: "700",
    fontSize: 13,
  },
  waShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHATSAPP_GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
    gap: 10,
    shadowColor: WHATSAPP_GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  waShareBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  myStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAF8",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5ECE5",
  },
  myStatBox: {
    flex: 1,
    alignItems: "center",
  },
  myStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#DDE5DD",
  },
  myStatNum: {
    fontSize: 20,
    fontWeight: "900",
    color: GREEN_PRIMARY,
  },
  myStatLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    marginTop: 2,
  },
  myStatSub: {
    fontSize: 10,
    color: "#777",
  },
  guestPrompt: {
    alignItems: "center",
    paddingVertical: 12,
  },
  guestPromptEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  guestPromptTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1D1F",
    textAlign: "center",
  },
  guestPromptSub: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 19,
  },
  loginBtn: {
    backgroundColor: GREEN_PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  lastWinnerCard: {
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  lastWinnerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lastWinnerCrown: {
    fontSize: 32,
  },
  lastWinnerLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
  },
  lastWinnerName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1D1F",
    marginTop: 2,
  },
  lastWinnerMobile: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  lastWinnerPrize: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN_PRIMARY,
    marginTop: 3,
  },
  leaderboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  leaderboardSub: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  emptyBoard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyBoardEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyBoardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  emptyBoardSub: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 19,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FBF9",
    borderWidth: 1,
    borderColor: "#EBF0EB",
    gap: 10,
  },
  leaderRowFirst: {
    backgroundColor: "#FFFDF5",
    borderColor: "#FCD34D",
    borderWidth: 1.5,
  },
  leaderRowMe: {
    backgroundColor: "#E8F5E9",
    borderColor: GREEN_PRIMARY,
  },
  rankBadge: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#555",
  },
  rankMedalText: {
    fontSize: 22,
  },
  leaderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1D1F",
  },
  youTag: {
    backgroundColor: GREEN_PRIMARY,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youTagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  winningTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  winningTagText: {
    color: "#92400E",
    fontSize: 10,
    fontWeight: "800",
  },
  leaderMobile: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  countPill: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCE7DC",
  },
  countNum: {
    fontSize: 16,
    fontWeight: "900",
    color: GREEN_PRIMARY,
  },
  countUnit: {
    fontSize: 10,
    color: "#555",
    fontWeight: "600",
  },
  applyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  applyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    backgroundColor: "#FAFAFA",
  },
  applyBtn: {
    backgroundColor: GREEN_PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F0",
    gap: 10,
  },
  friendAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  friendName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },
  friendMobile: {
    fontSize: 12,
    color: "#777",
  },
  thisWeekTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  thisWeekTagText: {
    color: GREEN_PRIMARY,
    fontSize: 11,
    fontWeight: "700",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 12,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GREEN_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNum: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1D1F",
  },
  stepDesc: {
    fontSize: 12,
    color: "#5E646A",
    marginTop: 2,
    lineHeight: 18,
  },
});

