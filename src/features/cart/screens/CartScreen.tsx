import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppDispatch, useAppSelector } from "../../../shared/hooks/useRedux";
import {
  addItem,
  removeItem,
  selectCartItems,
  selectCartProducts,
  selectSubtotal,
  selectTotalItems,
  syncCart,
  updateItemAsync,
} from "../store/cartSlice";

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

// ─── EMPTY CART ───────────────────────────────────────────────────────────────
function EmptyCart() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconCircle}>
          <Image
            source={require("@/assets/images/shopping-cart.png")}
            style={styles.emptyImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>
          Looks like you haven&apos;t added any organic products yet. Explore our
          catalog to get started!
        </Text>
        <TouchableOpacity
          style={styles.shopBtn}
          activeOpacity={0.88}
          onPress={() => router.push("/home" as any)}
        >
          <Ionicons name="bag-handle-outline" size={18} color="#fff" />
          <Text style={styles.shopBtnText}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── CART ITEM (memoized) ─────────────────────────────────────────────────────
const CartItem = React.memo(function CartItem({
  item,
  isLast,
}: {
  item: any;
  isLast: boolean;
}) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const scale = useRef(new Animated.Value(1)).current;

  const product = item.product;
  if (!product) return null;

  const qty = item.qty;
  const unitPrice = product.priceRaw ?? 0;
  const lineTotal = unitPrice * qty;
  const weight = product.unit || "";
  const itemKey = product.id;

  const pulse = () =>
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start();

  const handleAdd = () => {
    pulse();
    const currentQty = cartItems[itemKey] ?? 0;
    const newQty = currentQty + 1;
    dispatch(addItem(itemKey));
    dispatch(updateItemAsync({ productId: itemKey, quantity: newQty }));
  };

  const handleRemove = () => {
    pulse();
    const currentQty = cartItems[itemKey] ?? 0;
    const newQty = Math.max(0, currentQty - 1);
    dispatch(removeItem(itemKey));
    dispatch(updateItemAsync({ productId: itemKey, quantity: newQty }));
  };

  return (
    <Animated.View
      style={[
        styles.cartRow,
        !isLast && styles.cartRowBorder,
        { transform: [{ scale }] },
      ]}
    >
      <View style={styles.imageBox}>
        <Image
          source={{ uri: getImage(product) }}
          style={styles.cartImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.cartInfo}>
        <Text style={styles.cartName} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.metaRow}>
          {!!weight && (
            <View style={styles.weightPill}>
              <Text style={styles.cartWeight}>{weight}</Text>
            </View>
          )}
          <Text style={styles.unitPriceText}>₹{unitPrice} / unit</Text>
        </View>

        <View style={styles.cartBottomRow}>
          <Text style={styles.lineTotalPrice}>₹{lineTotal}</Text>

          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
              onPress={handleRemove}
              activeOpacity={0.7}
            >
              {qty === 1 ? (
                <Ionicons name="trash-outline" size={14} color="#fff" />
              ) : (
                <Text style={styles.stepText}>−</Text>
              )}
            </TouchableOpacity>

            <View style={styles.stepQtyBox}>
              <Text style={styles.stepQty}>{qty}</Text>
            </View>

            <TouchableOpacity
              style={styles.stepBtn}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
              onPress={handleAdd}
              activeOpacity={0.7}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

// ─── MAIN CART SCREEN ─────────────────────────────────────────────────────────
export default function CartScreen() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartProducts);
  const subtotal = useAppSelector(selectSubtotal);
  const totalItems = useAppSelector(selectTotalItems);

  const isEmpty = cartItems.length === 0;

  useEffect(() => {
    dispatch(syncCart());
  }, [dispatch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/home" as any)}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Cart</Text>
          {!isEmpty && (
            <View style={styles.headerCountBadge}>
              <Text style={styles.headerCountText}>
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </Text>
            </View>
          )}
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* ── 2-Step Checkout Progress Bar ── */}
      {!isEmpty && (
        <View style={styles.stepBar}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, styles.stepDotActive]}>
              <Text style={styles.stepDotTextActive}>1</Text>
            </View>
            <Text style={styles.stepLabelActive}>Review Cart</Text>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.stepItem}>
            <View style={styles.stepDot}>
              <Text style={styles.stepDotText}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Bill & Payment</Text>
          </View>
        </View>
      )}

      {isEmpty ? (
        <EmptyCart />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Deliverables Card ── */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="cube-outline" size={18} color={GREEN} />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.sectionTitle}>Deliverables</Text>
                  <Text style={styles.sectionSubtitle}>
                    {cartItems.length}{" "}
                    {cartItems.length === 1 ? "product" : "products"} · Shipped
                    in secure package(s)
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.addMorePill}
                  onPress={() => router.push("/home" as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={14} color={GREEN} />
                  <Text style={styles.addMoreText}>Add more</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {cartItems.map((item: any, index: number) => (
                <CartItem
                  key={item.product?.id ?? item.product?.item_id}
                  item={item}
                  isLast={index === cartItems.length - 1}
                />
              ))}
            </View>

            {/* ── Next-Step Info Banner ── */}
            <View style={styles.infoBanner}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={GREEN}
              />
              <Text style={styles.infoBannerText}>
                Coupons, delivery charges & address selection are on the next
                step.
              </Text>
            </View>
          </ScrollView>

          {/* ── Sticky Bottom Bar ── */}
          <View style={styles.bottomZone}>
            <View style={styles.bottomPriceBlock}>
              <Text style={styles.bottomTotalLabel}>
                ITEMS TOTAL ({totalItems})
              </Text>
              <Text style={styles.bottomTotalValue}>₹{subtotal}</Text>
              <Text style={styles.bottomSubNote}>+ Delivery on next step</Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => router.push("/checkout/bill" as any)}
              activeOpacity={0.88}
            >
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
              <View style={styles.checkoutArrowCircle}>
                <Ionicons name="arrow-forward" size={16} color={GREEN} />
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
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
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  headerCountBadge: {
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  headerCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN,
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
  stepDotActive: {
    backgroundColor: GREEN,
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MID,
  },
  stepDotTextActive: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_LIGHT,
  },
  stepLabelActive: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
  },
  stepConnector: {
    width: 36,
    height: 1.5,
    backgroundColor: "#D8E2D8",
    marginHorizontal: 12,
  },

  scrollContent: {
    backgroundColor: BG,
    flexGrow: 1,
    padding: 14,
    paddingBottom: 120,
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
  addMorePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F2F5",
    marginVertical: 12,
  },

  cartRow: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  cartRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F5F7",
  },
  imageBox: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#EDF2ED",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  cartImage: {
    width: "100%",
    height: "100%",
  },
  cartInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  cartName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: TEXT_DARK,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  weightPill: {
    backgroundColor: "#F2F4F7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  cartWeight: {
    fontSize: 11,
    fontWeight: "600",
    color: TEXT_MID,
  },
  unitPriceText: {
    fontSize: 11.5,
    color: TEXT_LIGHT,
    fontWeight: "500",
  },

  cartBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 10,
  },
  lineTotalPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  stepper: {
    flexDirection: "row",
    backgroundColor: GREEN,
    borderRadius: 6,
    alignItems: "center",
    minHeight: 32,
    paddingHorizontal: 2,
  },
  stepBtn: {
    minWidth: 28,
    height: 30,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  stepQtyBox: {
    minWidth: 20,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepQty: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },

  // ── Info Banner ──
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#255827",
    fontWeight: "600",
    lineHeight: 16,
  },

  // ── Sticky Bottom Bar ──
  bottomZone: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#ECEEF2",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  bottomPriceBlock: {
    flex: 1,
    marginRight: 12,
  },
  bottomTotalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: TEXT_LIGHT,
    letterSpacing: 0.6,
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 1,
  },
  bottomSubNote: {
    fontSize: 10.5,
    color: GREEN,
    fontWeight: "600",
  },

  checkoutBtn: {
    backgroundColor: GREEN,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 2,
    shadowColor: GREEN,
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  checkoutBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  checkoutArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Empty Cart ──
  emptyContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyImage: { width: 90, height: 90 },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: TEXT_MID,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 24,
  },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GREEN,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },
  shopBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
