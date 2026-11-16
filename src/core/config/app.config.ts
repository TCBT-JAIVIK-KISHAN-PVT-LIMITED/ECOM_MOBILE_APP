import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Resolves the API base URL depending on environment:
 * - Production: live server https://api.tcbtjaivikkisan.com
 * - Dev: dynamically uses the Metro host IP (e.g. 192.168.1.4) so Android
 *   emulators and physical devices on Wi-Fi can reach the local backend.
 */
const getDevApiBaseUrl = (): string => {
  if (!__DEV__) {
    return "https://api.tcbtjaivikkisan.com";
  }

  // 1. Android Emulator (AVD):
  // 10.0.2.2 maps directly to the host PC's 127.0.0.1, bypassing Windows Defender
  // Firewall which blocks incoming connections to 192.168.x.x from the virtual adapter.
  if (Platform.OS === "android" && !Constants.isDevice) {
    return "http://10.0.2.2:3000";
  }

  // 2. Physical device on Wi-Fi: use the host IP detected from Metro bundler
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:3000`;
    }
  }

  // 3. Fallbacks
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://localhost:3000";
};

export const AppConfig = {
  /** App metadata */
  APP_NAME: "TCBT",
  APP_VERSION: "2.0.0",
  APP_SLUG: "client",

  /** API configuration — dynamic per environment */
  API_BASE_URL: getDevApiBaseUrl(),
  CDN_BASE_URL: "https://cdn2.zohoecommerce.com",
  STOREFRONT_DOMAIN: "products.tcbtjaivikkisan.com",

  /**
   * Zoho Payments SDK — publishable key for client-side payment session initialization.
   * ⚠️ SECURITY: Verify with Zoho that this is a publishable (client-safe) key.
   *    If it is a SECRET key, move it server-side immediately and rotate it.
   *    Get keys from: Zoho Payments → Developer Space → API Keys
   */
  ZOHO_PAYMENTS_API_KEY: "1003.485e2c1d68446d56454c02890412c4f6.3a68857c5822f34d8df8828ec7557455",
  ZOHO_PAYMENTS_ACCOUNT_ID: "60046963789",
  ZOHO_PAYMENTS_REGION: "india" as "india" | "us",
  ZOHO_PAYMENTS_MODE: "live" as "sandbox" | "live",  // must match backend mode


  /** Feature flags */
  FEATURES: {
    ENABLE_UPI_PAYMENT: true,
    ENABLE_CARD_PAYMENT: true,
    ENABLE_SOCIAL_LOGIN: false,
    ENABLE_SEARCH: false, // search route not yet implemented
  },

  /** Cart / Order rules */
  FREE_DELIVERY_THRESHOLD: 500,
  DELIVERY_FEE: 40,

  /** OTP */
  OTP_LENGTH: 6,
  PHONE_LENGTH: 10,
} as const;
