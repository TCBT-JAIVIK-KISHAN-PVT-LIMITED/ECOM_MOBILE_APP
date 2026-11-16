// src/features/cart/hooks/useCart.ts
import { useCallback, useEffect, useRef } from "react";
import {
  addItem,
  clearCart,
  clearItem,
  removeItem,
  selectCartItems,
  selectCartProducts,
  selectDeliveryFee,
  selectSubtotal,
  selectTotal,
  selectTotalItems,
  selectCartLoading,
  syncCart,
  updateItemAsync,
} from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../../../shared/hooks/useRedux";

export function useCart() {
  const dispatch = useAppDispatch();

  const cart        = useAppSelector(selectCartItems);
  const cartItems   = useAppSelector(selectCartProducts);
  const totalItems  = useAppSelector(selectTotalItems);
  const subtotal    = useAppSelector(selectSubtotal);
  const deliveryFee = useAppSelector(selectDeliveryFee);
  const total       = useAppSelector(selectTotal);
  const loading     = useAppSelector(selectCartLoading);

  // Keep a live ref to cart quantities so rapid taps within the same render frame
  // always compute the right next quantity and `add`/`remove` keep stable references.
  const cartRef = useRef(cart);
  cartRef.current = cart;

  // Sync cart from server on mount
  useEffect(() => {
    dispatch(syncCart());
  }, [dispatch]);

  const add = useCallback(
    (id: string) => {
      const key = String(id);
      const currentQty = cartRef.current[key] ?? 0;
      const newQty = currentQty + 1;
      cartRef.current = { ...cartRef.current, [key]: newQty };
      dispatch(addItem(key));
      dispatch(updateItemAsync({ productId: key, quantity: newQty }));
    },
    [dispatch]
  );

  const remove = useCallback(
    (id: string) => {
      const key = String(id);
      const currentQty = cartRef.current[key] ?? 0;
      const newQty = Math.max(0, currentQty - 1);
      const nextCart = { ...cartRef.current };
      if (newQty <= 0) {
        delete nextCart[key];
      } else {
        nextCart[key] = newQty;
      }
      cartRef.current = nextCart;
      dispatch(removeItem(key));
      dispatch(updateItemAsync({ productId: key, quantity: newQty }));
    },
    [dispatch]
  );

  const clear = useCallback(
    (id: string) => {
      const key = String(id);
      const nextCart = { ...cartRef.current };
      delete nextCart[key];
      cartRef.current = nextCart;
      dispatch(clearItem(key));
      dispatch(updateItemAsync({ productId: key, quantity: 0 }));
    },
    [dispatch]
  );

  const clearAll = useCallback(() => {
    cartRef.current = {};
    dispatch(clearCart());
  }, [dispatch]);

  const getQty = useCallback((id: string) => cart[id] ?? 0, [cart]);

  return {
    cart,
    cartItems,
    totalItems,
    subtotal,
    deliveryFee,
    total,
    loading,
    add,
    remove,
    clearItem: clear,
    clearCart: clearAll,
    getQty,
  };
}

export function useProductQty(productId: string) {
  const dispatch = useAppDispatch();
  const qty = useAppSelector((state) => state.cart.items[productId] ?? 0);
  const qtyRef = useRef(qty);
  qtyRef.current = qty;

  const add = useCallback(() => {
    const newQty = (qtyRef.current ?? 0) + 1;
    qtyRef.current = newQty;
    dispatch(addItem(productId));
    dispatch(updateItemAsync({ productId, quantity: newQty }));
  }, [dispatch, productId]);

  const remove = useCallback(() => {
    const newQty = Math.max(0, (qtyRef.current ?? 0) - 1);
    qtyRef.current = newQty;
    dispatch(removeItem(productId));
    dispatch(updateItemAsync({ productId, quantity: newQty }));
  }, [dispatch, productId]);

  return { qty, add, remove };
}
