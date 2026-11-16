// src/features/cart/store/cartSlice.ts
import {
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { RootState } from "../../../store/store";
import { RESET_APP } from "../../../store/resetAction";
import {
  fetchCart,
  updateCartItem,
  type CartResponse
} from "../services/cart.api";

// ─── Types ───────────────────────────────────────────────────────────────────

type CartProduct = {
  id: string;
  name: string;
  priceRaw: number;
  unit: string;
  image: string;
};

type CartState = {
  /** productId → quantity (local optimistic state) */
  items: Record<string, number>;
  /** Enriched product data from API */
  productData: Record<string, CartProduct>;
  /** Server cart total */
  serverTotal: number;
  /** Server cart total weight in grams */
  serverWeight: number;
  /** Loading / syncing state */
  loading: boolean;
  error: string | null;
};

const initialState: CartState = {
  items: {},
  productData: {},
  serverTotal: 0,
  serverWeight: 0,
  loading: false,
  error: null,
};

// ─── Debounce & Sequence Tracking for Cart Item Updates ──────────────────────

const DEBOUNCE_MS = 300;
const latestRequestSeq: Record<string, number> = {};
const syncedRequestSeq: Record<string, number> = {};
const pendingTimers: Record<
  string,
  { timer: ReturnType<typeof setTimeout>; resolve: (proceed: boolean) => void }
> = {};

function hasUnsyncedChanges(productId: string): boolean {
  return (latestRequestSeq[productId] ?? 0) > (syncedRequestSeq[productId] ?? 0);
}

// ─── Async Thunks ────────────────────────────────────────────────────────────

/** Fetch the full cart from the server */
export const syncCart = createAsyncThunk(
  "cart/syncCart",
  async (_, { rejectWithValue }) => {
    try {
      const cart = await fetchCart();
      return cart;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load cart");
    }
  }
);

/** Add/update/remove a single item via API (debounced per productId, ignores stale responses) */
export const updateItemAsync = createAsyncThunk(
  "cart/updateItem",
  async (
    { productId, quantity }: { productId: string; quantity: number },
    { rejectWithValue, dispatch, getState }
  ) => {
    const seq = (latestRequestSeq[productId] ?? 0) + 1;
    latestRequestSeq[productId] = seq;

    // Cancel any previous debounce timer for this product
    if (pendingTimers[productId]) {
      clearTimeout(pendingTimers[productId].timer);
      pendingTimers[productId].resolve(false);
      delete pendingTimers[productId];
    }

    // Wait for the user to finish rapid tapping on this product
    const shouldProceed = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        delete pendingTimers[productId];
        resolve(true);
      }, DEBOUNCE_MS);
      pendingTimers[productId] = { timer, resolve };
    });

    if (!shouldProceed || latestRequestSeq[productId] !== seq) {
      return { skipped: true as const };
    }

    // Read the latest optimistic quantity from Redux store (0 if removed from state.items)
    const state = getState() as RootState;
    const latestQty = state.cart.items[productId] ?? 0;

    try {
      console.log(`[CART SYNC] PATCH item: ${productId}, qty: ${latestQty} (seq: ${seq})`);
      const result = await updateCartItem(productId, latestQty);

      // If the user tapped again while this request was in flight, ignore this stale response
      if (latestRequestSeq[productId] !== seq) {
        console.log(
          `[CART SYNC] Ignoring stale PATCH response for ${productId} (seq ${seq} < ${latestRequestSeq[productId]})`
        );
        return { skipped: true as const };
      }

      syncedRequestSeq[productId] = seq;
      console.log('[CART SYNC] PATCH result:', JSON.stringify(result).substring(0, 300));

      return { skipped: false as const, cart: result };
    } catch (err: any) {
      if (latestRequestSeq[productId] === seq) {
        syncedRequestSeq[productId] = seq;
        console.error('[CART SYNC] PATCH failed:', err.message);
        // Re-sync with server so optimistic UI reverts to actual server state on error
        dispatch(syncCart());
        return rejectWithValue(err.message || "Failed to update cart");
      }
      return { skipped: true as const };
    }
  }
);

// ─── Helper: parse API cart response into local state shape ──────────────────

function parseCartResponse(cart: CartResponse) {
  const items: Record<string, number> = {};
  const productData: Record<string, CartProduct> = {};

  for (const item of cart.items || []) {
    if (!item.name) continue;
    const id = item.product_id;
    items[id] = item.quantity;
    productData[id] = {
      id,
      name: item.name,
      priceRaw: item.price || 0,
      unit: "",
      image: item.image_url || "https://via.placeholder.com/150",
    };
  }

  return {
    items,
    productData,
    serverTotal: cart.total_amount || 0,
    serverWeight: cart.totalWeight || 0,
  };
}

// ─── Slice ────────────────────────────────────────────────────────────────────

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    /** Optimistic add (increment by 1) — triggers API call separately */
    addItem(state, action: PayloadAction<string>) {
      const id = String(action.payload);
      state.items[id] = (state.items[id] ?? 0) + 1;
    },
    /** Store product details for optimistic cart rows */
    upsertProductData(state, action: PayloadAction<CartProduct>) {
      const product = action.payload;
      state.productData[product.id] = product;
    },
    /** Optimistic remove (decrement by 1) */
    removeItem(state, action: PayloadAction<string>) {
      const id = String(action.payload);
      const qty = (state.items[id] ?? 0) - 1;
      if (qty <= 0) {
        delete state.items[id];
      } else {
        state.items[id] = qty;
      }
    },
    /** Remove product entirely */
    clearItem(state, action: PayloadAction<string>) {
      delete state.items[String(action.payload)];
    },
    /** Clear entire cart */
    clearCart(state) {
      state.items = {};
      state.productData = {};
      state.serverTotal = 0;
      state.serverWeight = 0;
    },
  },
  extraReducers: (builder) => {
    // ── syncCart ──
    builder.addCase(syncCart.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(syncCart.fulfilled, (state, action) => {
      const parsed = parseCartResponse(action.payload);
      // Preserve local optimistic quantities for any products that are mid-debounce/in-flight
      const mergedItems: Record<string, number> = { ...parsed.items };
      for (const pid of Object.keys({ ...state.items, ...parsed.items })) {
        if (hasUnsyncedChanges(pid)) {
          if (state.items[pid] && state.items[pid] > 0) {
            mergedItems[pid] = state.items[pid];
          } else {
            delete mergedItems[pid];
          }
        }
      }
      state.items = mergedItems;
      state.productData = { ...state.productData, ...parsed.productData };
      state.serverTotal = parsed.serverTotal;
      state.serverWeight = parsed.serverWeight;
      state.loading = false;
    });
    builder.addCase(syncCart.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── updateItemAsync ──
    builder.addCase(updateItemAsync.fulfilled, (state, action) => {
      if (action.payload.skipped) return;
      const parsed = parseCartResponse(action.payload.cart);
      // Preserve local optimistic quantities for any products that are still mid-debounce/in-flight
      const mergedItems: Record<string, number> = { ...parsed.items };
      for (const pid of Object.keys({ ...state.items, ...parsed.items })) {
        if (hasUnsyncedChanges(pid)) {
          if (state.items[pid] && state.items[pid] > 0) {
            mergedItems[pid] = state.items[pid];
          } else {
            delete mergedItems[pid];
          }
        }
      }
      state.items = mergedItems;
      state.productData = { ...state.productData, ...parsed.productData };
      state.serverTotal = parsed.serverTotal;
      state.serverWeight = parsed.serverWeight;
      state.error = null;
    });
    builder.addCase(updateItemAsync.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // ── Global reset on logout ──
    builder.addCase(RESET_APP, () => initialState);
  },
});

export const { addItem, upsertProductData, removeItem, clearItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Raw items map { productId → qty } */
export const selectCartItems = (state: RootState) => state.cart.items;

/** Product enrichment data */
export const selectCartProductData = (state: RootState) => state.cart.productData;

/** Total number of items across all products */
export const selectTotalItems = createSelector(
  selectCartItems,
  (items) => Object.values(items).reduce((sum, qty) => sum + qty, 0)
);

/** Full cart items with product details */
export const selectCartProducts = createSelector(
  [selectCartItems, selectCartProductData],
  (items, productData) =>
    Object.entries(items)
      .filter(([, qty]) => qty > 0)
      .filter(([id]) => !!productData[id]) // skip items with no product data at all
      .map(([id, qty]) => ({ product: productData[id], qty }))
);

/** Subtotal (before delivery) */
export const selectSubtotal = createSelector(
  selectCartProducts,
  (items) =>
    items.reduce((sum, item) => sum + item.product.priceRaw * item.qty, 0)
);

/** Server-calculated total (if available) */
export const selectServerTotal = (state: RootState) => state.cart.serverTotal;

/** Server-calculated weight in grams (if available) */
export const selectServerWeight = (state: RootState) => state.cart.serverWeight;

/** Delivery fee — free above ₹500 */
export const selectDeliveryFee = createSelector(
  selectSubtotal,
  (subtotal) => (subtotal > 0 ? (subtotal >= 500 ? 0 : 40) : 0)
);

/** Grand total */
export const selectTotal = createSelector(
  selectSubtotal,
  selectDeliveryFee,
  (subtotal, fee) => subtotal + fee
);

/** Cart loading state */
export const selectCartLoading = (state: RootState) => state.cart.loading;

/** Cart error */
export const selectCartError = (state: RootState) => state.cart.error;

// ─── Weight helpers ───────────────────────────────────────────────────────────

/**
 * Parse a product unit string into grams.
 *
 * Handles patterns like: "500g", "1kg", "1.5kg", "250ml", "200gm", "1 kg"
 * Falls back to 0 if no recognisable unit is found.
 */
function parseUnitToGrams(unit: string): number {
  if (!unit) return 0;
  const str = unit.toLowerCase().replace(/\s+/g, '');

  // Match a number followed by a unit keyword
  const match = str.match(/^([\d.]+)(kg|g|gm|ml|l)$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const suffix = match[2];

  switch (suffix) {
    case 'kg':
    case 'l':
      return value * 1000; // kg → g,  litre → ml (treat as grams for weight)
    case 'g':
    case 'gm':
    case 'ml':
      return value;
    default:
      return 0;
  }
}

/**
 * Total weight of all items in the cart, in **grams**.
 * Used to determine the shipping package type (SPS vs B2B).
 */
export const selectTotalWeightGrams = createSelector(
  [selectCartProducts],
  (cartItems) =>
    cartItems.reduce(
      (total, { product, qty }) =>
        total + parseUnitToGrams(product.unit) * qty,
      0
    )
);
