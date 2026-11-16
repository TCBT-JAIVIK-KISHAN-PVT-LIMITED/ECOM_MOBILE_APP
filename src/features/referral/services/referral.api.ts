// src/features/referral/services/referral.api.ts
import { apiRequest } from "../../../shared/services/api.client";
import { getDeviceId } from "../../../shared/services/token.service";

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  masked_mobile: string;
  referral_count: number;
  is_me: boolean;
}

export interface WeeklyWinnerEntry {
  week_key: string;
  week_label: string;
  winner_user_id: string;
  winner_name: string;
  masked_mobile: string;
  referral_count: number;
  prize_name: string;
  contact_status: "pending_contact" | "contacted" | "dispatched";
  is_me: boolean;
}

export interface ReferredFriend {
  id: string;
  name: string;
  masked_mobile: string;
  week_key: string;
  is_current_week: boolean;
  joined_at: string;
}

export interface ReferralDashboardResponse {
  prize: {
    title: string;
    title_hi: string;
    description: string;
    description_hi: string;
  };
  current_week: {
    week_key: string;
    week_start: string;
    week_end: string;
    label: string;
    seconds_remaining: number;
  };
  me: {
    user_id: string;
    referral_code: string;
    weekly_referrals: number;
    total_referrals: number;
    current_rank: number | null;
    already_referred: boolean;
    won_week: {
      week_key: string;
      prize_name: string;
      referral_count: number;
      contact_status: string;
    } | null;
  } | null;
  leaderboard: LeaderboardEntry[];
  last_week_winner: WeeklyWinnerEntry | null;
  recent_winners: WeeklyWinnerEntry[];
  my_referred_friends: ReferredFriend[];
}

export async function fetchReferralLeaderboard(
  userId?: string | null
): Promise<ReferralDashboardResponse> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return apiRequest<ReferralDashboardResponse>(`/referrals/leaderboard${query}`);
}

export async function applyReferralCodeApi(
  userId: string,
  referralCode: string
): Promise<{
  success: boolean;
  message: string;
  referrer_name: string;
  week_key: string;
}> {
  let deviceId = "";
  try {
    deviceId = await getDeviceId();
  } catch {}
  return apiRequest(`/referrals/apply`, {
    method: "POST",
    body: { userId, referralCode, deviceId },
  });
}

