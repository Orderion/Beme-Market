/**
 * useFlashPrice.js
 * src/hooks/useFlashPrice.js
 */

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export function useFlashPrice(productId, basePrice) {
  const [state, setState] = useState({
    hasFlashDeal: false,
    flashPrice:   null,
    discountPct:  null,
    discountAmt:  null,
    saleEndsAt:   null,
    loading:      true,
  });

  useEffect(() => {
    if (!productId || !basePrice) { setState((s) => ({ ...s, loading: false })); return; }
    let alive = true;

    async function check() {
      try {
        const now = Timestamp.now();

        // 1. Seller flashSales
        try {
          const snap = await getDocs(query(
            collection(db, 'flashSales'),
            where('status',     '==',             'active'),
            where('productIds', 'array-contains', productId),
            where('endAt',      '>',              now)
          ));
          if (!snap.empty) {
            const sale = snap.docs[0].data();
            const endAt = sale.endAt?.toDate ? sale.endAt.toDate() : new Date(sale.endAt);
            const discVal = Number(sale.discountValue || 0);
            let flashPrice, discountPct, discountAmt;
            if (sale.discountType === 'pct') {
              flashPrice = Math.max(0, basePrice * (1 - discVal / 100));
              discountPct = discVal;
              discountAmt = basePrice - flashPrice;
            } else {
              flashPrice = Math.max(0, basePrice - discVal);
              discountAmt = discVal;
              discountPct = basePrice > 0 ? Math.round((discVal / basePrice) * 100) : 0;
            }
            if (alive) setState({ hasFlashDeal: true, flashPrice: parseFloat(flashPrice.toFixed(2)), discountPct, discountAmt: parseFloat(discountAmt.toFixed(2)), saleEndsAt: endAt, loading: false });
            return;
          }
        } catch (err) { console.warn('[useFlashPrice] flashSales:', err?.code); }

        // 2. Admin FlashDeals
        try {
          const adminSnap = await getDocs(query(collection(db, 'FlashDeals'), where('productId', '==', productId)));
          if (!adminSnap.empty) {
            const deal = adminSnap.docs[0].data();
            const endMs = deal.endsAt?.toMillis ? deal.endsAt.toMillis() : deal.endsAt ? Number(deal.endsAt) : null;
            if (endMs && endMs <= Date.now()) { if (alive) setState((s) => ({ ...s, loading: false })); return; }
            const dealPrice = Number(deal.dealPrice || 0);
            const discountAmt = basePrice - dealPrice;
            const discountPct = basePrice > 0 ? Math.round((discountAmt / basePrice) * 100) : 0;
            if (alive && dealPrice > 0 && dealPrice < basePrice) {
              setState({ hasFlashDeal: true, flashPrice: dealPrice, discountPct, discountAmt: parseFloat(discountAmt.toFixed(2)), saleEndsAt: endMs ? new Date(endMs) : null, loading: false });
              return;
            }
          }
        } catch (err) { console.warn('[useFlashPrice] FlashDeals:', err?.code); }

        if (alive) setState((s) => ({ ...s, loading: false }));
      } catch (err) {
        console.error('[useFlashPrice]', err);
        if (alive) setState((s) => ({ ...s, loading: false }));
      }
    }

    check();
    return () => { alive = false; };
  }, [productId, basePrice]);

  return state;
}
