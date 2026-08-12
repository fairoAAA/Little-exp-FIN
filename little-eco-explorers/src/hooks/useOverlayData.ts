import { useState, useCallback } from "react";

/**
 * Bazaviy (koddagi) massiv ustiga localStorage'dagi "qoralama" qatlamini
 * qo'yadi. Agar admin biror narsani tahrirlagan bo'lsa, o'sha o'zgarishlar
 * shu foydalanuvchi brauzerida ko'rinadi. Boshqa tashrif buyuruvchilar hali
 * ham bazaviy (standart) ma'lumotni ko'radi - buni haqiqiy saytga chiqarish
 * uchun "Eksport" orqali JSON faylni dasturchiga berish kerak.
 */
export function useOverlayData<T>(storageKey: string, base: T[]) {
  const [overlay, setOverlay] = useState<T[] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T[]) : null;
    } catch {
      return null;
    }
  });

  const data = overlay ?? base;
  const isCustomized = overlay !== null;

  const save = useCallback(
    (newData: T[]) => {
      setOverlay(newData);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(newData));
      } catch {
        /* saqlab bo'lmasa ham state yangilanadi */
      }
    },
    [storageKey]
  );

  const resetToBase = useCallback(() => {
    setOverlay(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* no-op */
    }
  }, [storageKey]);

  return { data, save, resetToBase, isCustomized };
}
