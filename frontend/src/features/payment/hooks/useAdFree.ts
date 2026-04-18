import { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector }     from 'react-redux';
import {
  initConnection,
  getProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type PurchaseError,
} from 'react-native-iap';
import { checkAdFreeStatus, purchaseAdFree } from '../store/paymentSlice';
import { toast }   from '@shared/components/ui/Toast/Toast';
import type { AppDispatch, RootState } from '@shared/store';

const PRODUCT_ID = 'wordle.adfree.lifetime';

export const useAdFree = () => {
  const dispatch  = useDispatch<AppDispatch>();
  const { isAdFree, isPurchasing, isChecked } = useSelector(
    (s: RootState) => s.payment
  );

  const [product,          setProduct]          = useState<Product | null>(null);
  const [iapReady,         setIapReady]         = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  // ── IAP başlat ────────────────────────────────────────
  useEffect(() => {
    let purchaseListener: ReturnType<typeof purchaseUpdatedListener>;
    let errorListener:    ReturnType<typeof purchaseErrorListener>;

    const init = async () => {
      try {
        await initConnection();
        setIapReady(true);

        // Satın alma güncellemelerini dinle
        purchaseListener = purchaseUpdatedListener(async (purchase) => {
          if (purchase.productId === PRODUCT_ID && purchase.transactionReceipt) {
            try {
              // Sunucu tarafında doğrula
              await dispatch(purchaseAdFree({
                storeToken:   purchase.purchaseToken ?? purchase.transactionReceipt,
                storeOrderId: purchase.transactionId ?? 'unknown',
              })).unwrap();

              // Google Play'e işlemi tamamla (acknowledge)
              await finishTransaction({ purchase, isConsumable: false });

              toast.show({
                message:  '🎉 Reklamsız deneyim aktifleştirildi!',
                variant:  'success',
                duration: 4000,
              });
            } catch (err: any) {
              toast.show({
                message: err ?? 'Satın alma doğrulanamadı.',
                variant: 'error',
              });
            }
          }
        });

        errorListener = purchaseErrorListener((error: PurchaseError) => {
          if (error.code !== 'E_USER_CANCELLED') {
            toast.show({
              message: `Satın alma hatası: ${error.message}`,
              variant: 'error',
            });
          }
        });
      } catch {
        setIapReady(false);
      }
    };

    init();

    return () => {
      purchaseListener?.remove();
      errorListener?.remove();
    };
  }, [dispatch]);

  // ── Ad-free durumunu kontrol et ───────────────────────
  useEffect(() => {
    if (!isChecked) {
      dispatch(checkAdFreeStatus());
    }
  }, [dispatch, isChecked]);

  // ── Ürün bilgisini çek ────────────────────────────────
  const loadProduct = useCallback(async () => {
    if (!iapReady) return;
    setIsLoadingProduct(true);
    try {
      const products = await getProducts({ skus: [PRODUCT_ID] });
      if (products.length > 0) setProduct(products[0]);
    } catch {
      // Ürün yüklenemedi — sessizce geç
    } finally {
      setIsLoadingProduct(false);
    }
  }, [iapReady]);

  // ── Satın alma başlat ─────────────────────────────────
  const startPurchase = useCallback(async () => {
    if (!iapReady || isAdFree || isPurchasing) return;
    try {
      await requestPurchase({ sku: PRODUCT_ID });
      // Gerisi purchaseUpdatedListener'da işlenir
    } catch (err: any) {
      if (err.code !== 'E_USER_CANCELLED') {
        toast.show({ message: 'Satın alma başlatılamadı.', variant: 'error' });
      }
    }
  }, [iapReady, isAdFree, isPurchasing]);

  return {
    isAdFree,
    isPurchasing,
    isChecked,
    product,
    iapReady,
    isLoadingProduct,
    loadProduct,
    startPurchase,
  };
};
