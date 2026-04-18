import { apiClient } from '@shared/api/apiClient';

export interface PurchaseResult {
  success:    boolean;
  purchaseId: string;
  message:    string;
}

export interface AdFreeStatus {
  isAdFree:    boolean;
  productId:   string;
  purchasedAt: string | null;
}

export const paymentApi = {
  verifyAdFreePurchase: async (
    storeToken:   string,
    storeOrderId: string
  ): Promise<PurchaseResult> => {
    const { data } = await apiClient.post<PurchaseResult>('/payment/adfree/verify', {
      storeToken,
      storeOrderId,
    });
    return data;
  },

  getAdFreeStatus: async (): Promise<AdFreeStatus> => {
    const { data } = await apiClient.get<AdFreeStatus>('/payment/adfree/status');
    return data;
  },
};
