import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppDispatch, useAppSelector } from "../../../shared/hooks/useRedux";
import {
  selectCartProducts,
  selectServerWeight,
  selectSubtotal,
  selectTotalItems,
} from "../../cart/store/cartSlice";
import { useOrder } from "../hooks/useOrder";
import { openCheckout } from "../services/zoho-payments";
import { setTempAddress, setTempAddressId } from "../store/orderSlice";
import {
  calcShippingInBackground,
  selectShippingCharge,
  selectShippingData,
  selectShippingError,
  selectShippingStatus,
} from "../store/shippingSlice";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const GREEN = "#196F1B";
const GREEN_LIGHT = "#EAF5EA";
const GREEN_BORDER = "#C8E6C9";
const BG = "#F4F6F8";
const TEXT_DARK = "#1A1D1F";
const TEXT_MID = "#5E646A";
const TEXT_LIGHT = "#8E959E";

// ─── IMAGE HELPER ─────────────────────────────────────────────────────────────
const getImage = (p: any) =>
  p?.image_url ||
  p?.image ||
  (p?.image_name && p?.image_document_id
    ? `https://cdn2.zohoecommerce.com/product-images/${p.image_name}/${p.image_document_id}/800x800?storefront_domain=products.tcbtjaivikkisan.com`
    : "https://via.placeholder.com/150");

// ─── ADDRESS BOTTOM SHEET ────────────────────────────────────────────────────
function AddressBottomSheet({
  visible,
  addresses,
  selectedIdx,
  onSelect,
  onClose,
  onPlaceOrder,
  isProcessing,
  userPhone,
}: {
  visible: boolean;
  addresses: any[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  onClose: () => void;
  onPlaceOrder: () => void;
  isProcessing?: boolean;
  userPhone?: string | null;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Select delivery location</Text>
            <Text style={styles.sheetSubTitle}>
              Shipping rates update automatically for your pincode
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.sheetCloseBtn}
          >
            <Ionicons name="close" size={18} color={TEXT_DARK} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ maxHeight: 310 }}
          showsVerticalScrollIndicator={false}
        >
          {addresses.map((addr: any, idx: number) => {
            const isSelected = selectedIdx === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.addrCard, isSelected && styles.addrCardSelected]}
                onPress={() => onSelect(idx)}
                activeOpacity={0.82}
              >
                <View
                  style={[
                    styles.addrIconBox,
                    isSelected && styles.addrIconBoxSelected,
                  ]}
                >
                  <Ionicons
                    name="location"
                    size={18}
                    color={isSelected ? GREEN : TEXT_MID}
                  />
                </View>

                <View style={styles.addrTextBlock}>
                  <View style={styles.addrLabelRow}>
                    <Text style={styles.addrLabel}>
                      {addr.label || "Home"}
                    </Text>
                    {!!addr.pincode && (
                      <View style={styles.pincodePill}>
                        <Text style={styles.pincodePillText}>
                          {addr.pincode}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addrLine} numberOfLines={2}>
                    {addr.line1}
                    {addr.city ? `, ${addr.city}` : ""}
                    {addr.state ? `, ${addr.state}` : ""}
                  </Text>
                  <Text style={styles.addrPhone}>
                    📞 {addr.receiver_phone || userPhone || ""}
                  </Text>
                </View>

                <View
                  style={[styles.radio, isSelected && styles.radioSelected]}
                >
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.addAddrRow}
            activeOpacity={0.8}
            onPress={() => {
              onClose();
              router.push("/add-address" as any);
            }}
          >
            <View style={styles.addAddrIconCircle}>
              <Ionicons name="add" size={18} color={GREEN} />
            </View>
            <Text style={styles.addAddrText}>Add a new delivery address</Text>
            <Ionicons name="chevron-forward" size={16} color={GREEN} />
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          style={[styles.sheetCta, isProcessing && styles.sheetCtaDisabled]}
          onPress={onPlaceOrder}
          disabled={isProcessing}
          activeOpacity={0.88}
        >
          {isProcessing ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.sheetCtaText}>Processing…</Text>
            </View>
          ) : (
            <Text style={styles.sheetCtaText}>Confirm & Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── MAIN CHECKOUT / BILLABLE SCREEN ──────────────────────────────────────────
export default function CheckoutScreen() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartProducts);
  const subtotal = useAppSelector(selectSubtotal);
  const totalItems = useAppSelector(selectTotalItems);
  const serverWeight = useAppSelector(selectServerWeight);
  const userId = useAppSelector((state) => state.user.userId);
  const userPhone = useAppSelector((state) => state.user.phone);
  const userAddresses = useAppSelector((state) => state.user.addresses) || [];

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const addresses = userAddresses;
  const prevAddrCount = useRef(addresses.length);

  // Auto-select newest address when user adds one, clamp on delete
  useEffect(() => {
    if (addresses.length > prevAddrCount.current) {
      setSelectedAddressIdx(addresses.length - 1);
    } else if (
      addresses.length < prevAddrCount.current &&
      selectedAddressIdx >= addresses.length
    ) {
      setSelectedAddressIdx(Math.max(0, addresses.length - 1));
    }
    prevAddrCount.current = addresses.length;
  }, [addresses.length]);

  // ── Coupon state ──
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<
    "idle" | "loading" | "applied" | "error"
  >("idle");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponType, setCouponType] = useState<"flat" | "percent" | null>(null);
  const [couponValue, setCouponValue] = useState(0);

  const { submitOrderAsync } = useOrder();

  const selectedAddress = addresses[selectedAddressIdx] ?? addresses[0] ?? null;

  // ── Shipping from Redux (calculated only on Checkout screen) ──────────────
  const shippingStatus = useAppSelector(selectShippingStatus);
  const shippingData = useAppSelector(selectShippingData);
  const shippingError = useAppSelector(selectShippingError);
  const shippingCharge = useAppSelector(selectShippingCharge);

  const shipping =
    shippingStatus === "success" && shippingData
      ? { status: "success" as const, data: shippingData }
      : shippingStatus === "loading"
        ? { status: "loading" as const }
        : shippingStatus === "error"
          ? {
              status: "error" as const,
              message: shippingError || "Could not fetch rate",
            }
          : { status: "idle" as const };

  // Fetch shipping rate ONCE when Checkout screen opens or when selected address changes
  useEffect(() => {
    const pincode = Number(selectedAddress?.pincode);
    if (!pincode || cartItems.length === 0) {
      return;
    }

    dispatch(
      calcShippingInBackground({
        pincode,
        totalWeight: serverWeight > 0 ? serverWeight : undefined,
      })
    );
    // Only run on mount and when the user switches delivery address
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.pincode, selectedAddress?._id]);

  const grandTotal = Math.max(
    0,
    subtotal + Math.round(shippingCharge) - couponDiscount
  );

  // ── Coupon handlers ──
  const handleApplyCoupon = useCallback(async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponStatus("loading");
    try {
      const { validateCoupon } = await import("../../cart/services/coupon.api");
      const coupon = await validateCoupon(code);

      let disc = 0;
      if (coupon.type === "percent") {
        disc = Math.round((subtotal * coupon.value) / 100);
      } else {
        disc = coupon.value;
      }

      setCouponId(coupon._id);
      setCouponType(coupon.type);
      setCouponValue(coupon.value);
      setCouponDiscount(disc);
      setCouponCode(coupon.name);
      setCouponMessage(
        coupon.type === "percent"
          ? `${coupon.value}% off applied! You save ₹${disc}`
          : `Flat ₹${disc} off applied!`
      );
      setCouponStatus("applied");
    } catch (err: any) {
      setCouponId(null);
      setCouponDiscount(0);
      setCouponMessage(err?.message || "Invalid coupon code");
      setCouponStatus("error");
    }
  }, [couponCode, subtotal]);

  const handleRemoveCoupon = useCallback(() => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponMessage("");
    setCouponStatus("idle");
    setCouponId(null);
    setCouponType(null);
    setCouponValue(0);
  }, []);

  // Recalculate coupon discount when subtotal changes
  useEffect(() => {
    if (couponStatus !== "applied" || !couponType) return;
    const newDisc =
      couponType === "percent"
        ? Math.round((subtotal * couponValue) / 100)
        : couponValue;
    setCouponDiscount(newDisc);
    setCouponMessage(
      couponType === "percent"
        ? `${couponValue}% off applied! You save ₹${newDisc}`
        : `Flat ₹${newDisc} off applied!`
    );
  }, [subtotal, couponStatus, couponType, couponValue]);

  // Sync selected address into orderSlice whenever it changes
  useEffect(() => {
    if (!selectedAddress) return;
    if (selectedAddress._id) {
      dispatch(setTempAddressId(selectedAddress._id));
    }
    dispatch(
      setTempAddress({
        name:
          selectedAddress.receiver_name || selectedAddress.label || "Customer",
        phone: selectedAddress.receiver_phone || selectedAddress.phone || "",
        street: selectedAddress.line1 || "",
        city: selectedAddress.city || "",
        state: selectedAddress.state || "",
        pincode: selectedAddress.pincode || "",
      })
    );
  }, [selectedAddress, dispatch]);

  // ── Place Order → Zoho Checkout ──────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedAddress || isProcessing) return;

    let addressId = selectedAddress._id;
    if (!addressId) {
      try {
        const { fetchUserProfile } = await import(
          "../../profile/services/user.api"
        );
        const { setAddresses } = await import("../../auth/store/userSlice");
        if (userId) {
          const profile = await fetchUserProfile(userId);
          if (profile?.addresses && profile.addresses.length > 0) {
            dispatch(setAddresses(profile.addresses));
            const match = profile.addresses.find(
              (a: any) =>
                a.line1 === selectedAddress.line1 &&
                a.pincode === selectedAddress.pincode &&
                a.receiver_phone === selectedAddress.receiver_phone
            );
            if (match?._id) {
              addressId = match._id;
            }
          }
        }
      } catch (fetchErr: any) {
        console.error(
          "[CHECKOUT] Failed to fetch addresses:",
          fetchErr?.message
        );
      }

      if (!addressId) {
        Alert.alert(
          "Address Error",
          "Your address is missing an ID. Please delete this address, re-add it, and try again."
        );
        return;
      }
    }

    try {
      setIsProcessing(true);
      dispatch(setTempAddressId(addressId));

      const result = await submitOrderAsync(addressId, couponId || undefined);
      const { paymentSessionId } = result;

      if (!paymentSessionId) {
        throw new Error("No payment session received from server");
      }

      setSheetVisible(false);
      const paymentResult = await openCheckout(paymentSessionId);

      if (paymentResult.status === "cancelled") {
        Alert.alert("Payment Cancelled", "You can try again when ready.");
        return;
      }

      if (paymentResult.status === "failed") {
        Alert.alert(
          "Payment Failed",
          paymentResult.errorMessage || "Please try again."
        );
        return;
      }

      router.push("/checkout/success");
    } catch (err: any) {
      Alert.alert(
        "Order Failed",
        err?.message || String(err) || "Could not place order. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill & Payment</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── 2-Step Checkout Progress Bar (Step 2 Active) ── */}
      <View style={styles.stepBar}>
        <TouchableOpacity
          style={styles.stepItem}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <View style={[styles.stepDot, styles.stepDotDone]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <Text style={styles.stepLabelDone}>Review Cart</Text>
        </TouchableOpacity>

        <View style={styles.stepConnectorDone} />

        <View style={styles.stepItem}>
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Text style={styles.stepDotTextActive}>2</Text>
          </View>
          <Text style={styles.stepLabelActive}>Bill & Payment</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Compact Order Summary Card ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="bag-check-outline" size={18} color={GREEN} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <Text style={styles.sectionSubtitle}>
                {totalItems} {totalItems === 1 ? "item" : "items"} in your
                package
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editCartPill}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={13} color={GREEN} />
              <Text style={styles.editCartLink}>Edit Cart</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {cartItems.map((item: any, idx: number) => {
            const product = item.product;
            if (!product) return null;
            const price = product.priceRaw ?? 0;
            const isLast = idx === cartItems.length - 1;
            return (
              <View
                key={product.id ?? product.item_id}
                style={[styles.summaryRow, !isLast && styles.summaryRowBorder]}
              >
                <View style={styles.summaryImgBox}>
                  <Image
                    source={{ uri: getImage(product) }}
                    style={styles.summaryImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View style={styles.summaryMetaRow}>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>Qty: {item.qty}</Text>
                    </View>
                    <Text style={styles.summaryUnitPrice}>× ₹{price}</Text>
                  </View>
                </View>
                <Text style={styles.summaryLineTotal}>
                  ₹{price * item.qty}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Apply Coupon Card ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="pricetag-outline" size={17} color={GREEN} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.sectionTitle}>Offers & Benefits</Text>
              <Text style={styles.sectionSubtitle}>
                Have a promo code? Apply it below
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {couponStatus === "applied" ? (
            <View style={styles.couponAppliedRow}>
              <View style={styles.couponAppliedIcon}>
                <Ionicons name="checkmark-circle" size={22} color={GREEN} />
              </View>
              <View style={styles.couponAppliedLeft}>
                <View style={styles.couponBadge}>
                  <Text style={styles.couponBadgeText}>{couponCode}</Text>
                </View>
                <Text style={styles.couponSuccessMsg}>{couponMessage}</Text>
              </View>
              <TouchableOpacity
                style={styles.couponRemoveBtn}
                onPress={handleRemoveCoupon}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.couponRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.couponInputRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter coupon code (e.g. SAVE10)"
                  placeholderTextColor="#9CA3AF"
                  value={couponCode}
                  onChangeText={(t) => {
                    setCouponCode(t.toUpperCase());
                    if (couponStatus === "error") setCouponStatus("idle");
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={couponStatus !== "loading"}
                />
                <TouchableOpacity
                  style={[
                    styles.couponApplyBtn,
                    (!couponCode.trim() || couponStatus === "loading") &&
                      styles.couponApplyBtnDisabled,
                  ]}
                  onPress={handleApplyCoupon}
                  disabled={!couponCode.trim() || couponStatus === "loading"}
                  activeOpacity={0.85}
                >
                  {couponStatus === "loading" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.couponApplyText}>APPLY</Text>
                  )}
                </TouchableOpacity>
              </View>
              {couponStatus === "error" && (
                <View style={styles.couponErrorRow}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.couponErrorMsg}>{couponMessage}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Bill Details Card ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="receipt-outline" size={17} color={GREEN} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.sectionTitle}>Bill Details</Text>
              <Text style={styles.sectionSubtitle}>
                Transparent breakdown of your order
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Items Total */}
          <View style={styles.billRow}>
            <View style={styles.billLabelGroup}>
              <Ionicons name="basket-outline" size={15} color={TEXT_MID} />
              <Text style={styles.billLabel}>Items total</Text>
            </View>
            <Text style={styles.billValue}>₹{subtotal}</Text>
          </View>

          {/* Delivery Charge */}
          <View style={[styles.billRow, { alignItems: "flex-start" }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.billLabelGroup}>
                <Ionicons name="bicycle-outline" size={15} color={TEXT_MID} />
                <Text style={styles.billLabel}>Delivery partner fee</Text>
              </View>
              {shipping.status === "success" && shipping.data.courier ? (
                <View style={styles.courierPill}>
                  <Ionicons
                    name="flash-outline"
                    size={11}
                    color={GREEN}
                  />
                  <Text style={styles.courierTag} numberOfLines={1}>
                    {shipping.data.courier} · {shipping.data.estimatedDelivery}
                  </Text>
                </View>
              ) : null}
            </View>

            {shipping.status === "loading" ? (
              <View style={styles.calcBadge}>
                <ActivityIndicator size="small" color={GREEN} />
                <Text style={styles.calcBadgeText}>Fetching…</Text>
              </View>
            ) : shipping.status === "success" ? (
              <Text
                style={[
                  styles.billValue,
                  shippingCharge === 0 && styles.billValueFree,
                ]}
              >
                {shippingCharge === 0 ? "FREE" : `₹${Math.round(shippingCharge)}`}
              </Text>
            ) : shipping.status === "error" ? (
              <Text style={styles.billValueError}>Unavailable</Text>
            ) : (
              <Text style={styles.billValue}>–</Text>
            )}
          </View>

          {shipping.status === "error" && (
            <View style={styles.shippingErrorBox}>
              <Ionicons name="warning-outline" size={15} color="#B45309" />
              <Text style={styles.shippingErrorText}>{shipping.message}</Text>
            </View>
          )}

          {/* Coupon Discount */}
          {couponDiscount > 0 && (
            <View style={styles.billRow}>
              <View style={styles.billLabelGroup}>
                <Ionicons name="sparkles-outline" size={15} color={GREEN} />
                <Text style={[styles.billLabel, { color: GREEN, fontWeight: "600" }]}>
                  Coupon discount ({couponCode})
                </Text>
              </View>
              <Text
                style={[
                  styles.billValue,
                  { color: GREEN, fontWeight: "700" },
                ]}
              >
                −₹{couponDiscount}
              </Text>
            </View>
          )}

          <View style={styles.dashedDivider} />

          {/* Grand Total Box */}
          <View style={styles.toPayBox}>
            <View>
              <Text style={styles.billLabelBold}>To Pay</Text>
              <Text style={styles.toPaySubText}>Incl. of all taxes & charges</Text>
            </View>
            <Text style={styles.billValueBold}>₹{grandTotal}</Text>
          </View>

          {couponDiscount > 0 && (
            <View style={styles.savingsBanner}>
              <Ionicons name="happy-outline" size={16} color={GREEN} />
              <Text style={styles.savingsBannerText}>
                You are saving ₹{couponDiscount} on this order!
              </Text>
            </View>
          )}
        </View>

        {/* ── Cancellation Policy Card ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={TEXT_MID}
            />
            <Text style={[styles.sectionTitle, { marginLeft: 6, fontSize: 13.5 }]}>
              Cancellation Policy
            </Text>
          </View>
          <Text style={styles.policyText}>
            Once your order is placed, any cancellation may result in a small
            processing fee. In case of unexpected delays leading to order
            cancellation, complete support will be provided.
          </Text>
        </View>
      </ScrollView>

      {/* ── Fixed Bottom Zone: Delivery Address + Place Order Button ── */}
      <View style={styles.bottomZone}>
        {addresses.length === 0 ? (
          <TouchableOpacity
            style={styles.addAddrPrompt}
            activeOpacity={0.85}
            onPress={() => router.push("/add-address" as any)}
          >
            <View style={styles.addAddrPromptLeft}>
              <View style={styles.addAddrIconCircleLarge}>
                <Ionicons name="location-outline" size={20} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addAddrPromptTitle}>
                  Add delivery address
                </Text>
                <Text style={styles.addAddrPromptSub}>
                  Required to calculate shipping & place order
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={GREEN} />
          </TouchableOpacity>
        ) : (
          <View style={styles.addressStrip}>
            <View style={styles.addressStripIcon}>
              <Ionicons name="location" size={18} color={GREEN} />
            </View>

            <View style={styles.addressStripBody}>
              <View style={styles.addressStripTopRow}>
                <Text style={styles.deliveringToText}>Delivering to </Text>
                <View style={styles.addressTagPill}>
                  <Text style={styles.addressTagText}>
                    {selectedAddress?.label ?? "Home"}
                  </Text>
                </View>
              </View>
              <Text style={styles.addressText} numberOfLines={1}>
                {[
                  selectedAddress?.line1,
                  selectedAddress?.line2,
                  selectedAddress?.city,
                  selectedAddress?.state,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              {selectedAddress?.receiver_phone || userPhone ? (
                <Text style={styles.addressPhone}>
                  📞 {selectedAddress?.receiver_phone || userPhone}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => setSheetVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.paymentBtn,
            (addresses.length === 0 ||
              isProcessing ||
              shipping.status !== "success") &&
              styles.paymentBtnDisabled,
          ]}
          disabled={
            addresses.length === 0 ||
            isProcessing ||
            shipping.status !== "success"
          }
          onPress={handlePlaceOrder}
          activeOpacity={0.88}
        >
          {isProcessing ? (
            <View style={styles.btnContentRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.paymentBtnText}>Processing payment…</Text>
            </View>
          ) : shipping.status === "loading" ? (
            <View style={styles.btnContentRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.paymentBtnText}>Calculating delivery…</Text>
            </View>
          ) : shipping.status === "error" ? (
            <View style={styles.btnContentRow}>
              <Ionicons name="alert-circle-outline" size={18} color="#fff" />
              <Text style={styles.paymentBtnText}>Delivery unavailable</Text>
            </View>
          ) : (
            <View style={styles.btnSplitRow}>
              <View>
                <Text style={styles.btnSmallTotalLabel}>TOTAL TO PAY</Text>
                <Text style={styles.btnTotalAmount}>₹{grandTotal}</Text>
              </View>
              <View style={styles.btnRightAction}>
                <Text style={styles.paymentBtnText}>Place Order</Text>
                <Ionicons name="lock-closed" size={15} color="#fff" />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <AddressBottomSheet
        visible={sheetVisible}
        addresses={addresses}
        selectedIdx={selectedAddressIdx}
        onSelect={(idx) => {
          setSelectedAddressIdx(idx);
          setSheetVisible(false);
        }}
        onClose={() => setSheetVisible(false)}
        onPlaceOrder={handlePlaceOrder}
        isProcessing={isProcessing}
        userPhone={userPhone}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    height: 56,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  // ── Step Progress Bar ──
  stepBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFDF9",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#EBF2EB",
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E4E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: {
    backgroundColor: GREEN,
  },
  stepDotActive: {
    backgroundColor: GREEN,
  },
  stepDotTextActive: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  stepLabelDone: {
    fontSize: 12,
    fontWeight: "600",
    color: GREEN,
  },
  stepLabelActive: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  stepConnectorDone: {
    width: 36,
    height: 2,
    backgroundColor: GREEN,
    marginHorizontal: 12,
  },

  scrollContent: {
    backgroundColor: BG,
    flexGrow: 1,
    padding: 14,
    paddingBottom: 215,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: TEXT_LIGHT,
    marginTop: 1,
  },
  editCartPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  editCartLink: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F2F5",
    marginVertical: 12,
  },

  // ── Order Summary Rows ──
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F4F6F8",
  },
  summaryImgBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#EDF2ED",
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryImage: {
    width: "100%",
    height: "100%",
  },
  summaryInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  summaryName: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  qtyBadge: {
    backgroundColor: "#F2F4F7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  qtyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MID,
  },
  summaryUnitPrice: {
    fontSize: 11.5,
    color: TEXT_LIGHT,
    fontWeight: "500",
  },
  summaryLineTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  // ── Coupon ──
  couponInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    color: TEXT_DARK,
    backgroundColor: "#F8FAFC",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  couponApplyBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 78,
  },
  couponApplyBtnDisabled: {
    backgroundColor: "#A5C8A6",
  },
  couponApplyText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12.5,
    letterSpacing: 0.5,
  },
  couponErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  couponErrorMsg: {
    fontSize: 11.5,
    color: "#EF4444",
    fontWeight: "600",
  },
  couponAppliedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FAF0",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  couponAppliedIcon: {
    marginRight: 10,
  },
  couponAppliedLeft: {
    flex: 1,
    marginRight: 8,
  },
  couponBadge: {
    backgroundColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 3,
  },
  couponBadgeText: {
    color: "#fff",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  couponSuccessMsg: {
    fontSize: 12,
    color: "#1E6020",
    fontWeight: "600",
  },
  couponRemoveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  couponRemoveText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "700",
  },

  // ── Bill Details ──
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  billLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  billLabel: {
    fontSize: 13.5,
    color: TEXT_MID,
    fontWeight: "500",
  },
  billValue: {
    fontSize: 13.5,
    color: TEXT_DARK,
    fontWeight: "700",
  },
  billValueFree: {
    color: GREEN,
    fontWeight: "800",
  },
  billValueError: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 12.5,
  },
  courierPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 5,
    marginLeft: 22,
    gap: 4,
  },
  courierTag: {
    fontSize: 11,
    color: GREEN,
    fontWeight: "600",
  },
  calcBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calcBadgeText: {
    fontSize: 12,
    color: GREEN,
    fontWeight: "600",
  },
  shippingErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  shippingErrorText: {
    flex: 1,
    fontSize: 11.5,
    color: "#92400E",
    fontWeight: "600",
  },
  dashedDivider: {
    height: 1,
    borderWidth: 0.8,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginVertical: 12,
  },
  toPayBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billLabelBold: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  toPaySubText: {
    fontSize: 11,
    color: TEXT_LIGHT,
    marginTop: 1,
  },
  billValueBold: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  savingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  savingsBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
  },

  policyText: {
    fontSize: 12,
    color: TEXT_MID,
    lineHeight: 17,
    marginTop: 8,
  },

  // ── Sticky Bottom Zone ──
  bottomZone: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#ECEEF2",
    elevation: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },

  addressStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8EEF3",
  },
  addressStripIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  addressStripBody: {
    flex: 1,
    marginRight: 8,
  },
  addressStripTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveringToText: {
    fontSize: 12,
    color: TEXT_MID,
    fontWeight: "600",
  },
  addressTagPill: {
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  addressTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: GREEN,
  },
  addressText: {
    fontSize: 12,
    color: TEXT_DARK,
    fontWeight: "500",
    marginTop: 2,
  },
  addressPhone: {
    fontSize: 11,
    color: TEXT_MID,
    marginTop: 2,
    fontWeight: "500",
  },

  changeBtn: {
    borderWidth: 1,
    borderColor: GREEN,
    backgroundColor: "#fff",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeBtnText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "700",
  },

  paymentBtn: {
    backgroundColor: GREEN,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 18,
    shadowColor: GREEN,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  paymentBtnDisabled: {
    backgroundColor: "#9FBF9F",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  btnSmallTotalLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.6,
  },
  btnTotalAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
  },
  btnRightAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paymentBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  // ── Add-address prompt ──
  addAddrPrompt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FDF9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: GREEN,
  },
  addAddrPromptLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  addAddrIconCircleLarge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GREEN_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  addAddrPromptTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  addAddrPromptSub: {
    fontSize: 11,
    color: TEXT_MID,
    marginTop: 2,
  },

  // ── Address Bottom Sheet ──
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8DCE0",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  sheetSubTitle: {
    fontSize: 11.5,
    color: TEXT_LIGHT,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F4F7",
    justifyContent: "center",
    alignItems: "center",
  },

  addrCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#ECEEF2",
  },
  addrCardSelected: {
    borderColor: GREEN,
    backgroundColor: "#F2FAF2",
  },
  addrIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EAEEF2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  addrIconBoxSelected: {
    backgroundColor: GREEN_LIGHT,
  },
  addrTextBlock: {
    flex: 1,
  },
  addrLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  addrLabel: {
    fontSize: 13.5,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  pincodePill: {
    backgroundColor: "#E8EEF3",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  pincodePillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: TEXT_MID,
  },
  addrLine: {
    fontSize: 12,
    color: TEXT_MID,
    lineHeight: 16,
  },
  addrPhone: {
    fontSize: 11,
    color: TEXT_LIGHT,
    marginTop: 4,
    fontWeight: "500",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginTop: 2,
  },
  radioSelected: {
    borderColor: GREEN,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  addAddrRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FCF8",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    marginBottom: 6,
  },
  addAddrIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  addAddrText: {
    flex: 1,
    fontSize: 13,
    color: GREEN,
    fontWeight: "700",
  },

  sheetCta: {
    backgroundColor: GREEN,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  sheetCtaText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  sheetCtaDisabled: {
    backgroundColor: "#999",
  },
});
