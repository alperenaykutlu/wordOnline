import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { paymentApi } from '../api/paymentApi';

interface PaymentState {
  isAdFree:    boolean;
  isChecked:   boolean;   // Status ilk kez sorgulandı mı
  isPurchasing:boolean;
  error:       string | null;
}

const initialState: PaymentState = {
  isAdFree:    false,
  isChecked:   false,
  isPurchasing:false,
  error:       null,
};

// ── Thunks ───────────────────────────────────────────────

export const checkAdFreeStatus = createAsyncThunk(
  'payment/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      return await paymentApi.getAdFreeStatus();
    } catch {
      return rejectWithValue('Durum kontrol edilemedi.');
    }
  }
);

export const purchaseAdFree = createAsyncThunk(
  'payment/purchase',
  async (
    { storeToken, storeOrderId }: { storeToken: string; storeOrderId: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await paymentApi.verifyAdFreePurchase(storeToken, storeOrderId);
      if (!result.success) return rejectWithValue(result.message);
      return result;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? 'Satın alma başarısız.');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────
const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Status kontrolü
    builder
      .addCase(checkAdFreeStatus.fulfilled, (state, action) => {
        state.isAdFree  = action.payload.isAdFree;
        state.isChecked = true;
      })
      .addCase(checkAdFreeStatus.rejected, (state) => {
        state.isChecked = true; // Hata olsa da checked sayıyoruz
      });

    // Satın alma
    builder
      .addCase(purchaseAdFree.pending, (state) => {
        state.isPurchasing = true;
        state.error        = null;
      })
      .addCase(purchaseAdFree.fulfilled, (state) => {
        state.isPurchasing = false;
        state.isAdFree     = true;
      })
      .addCase(purchaseAdFree.rejected, (state, action) => {
        state.isPurchasing = false;
        state.error        = action.payload as string;
      });
  },
});

export default paymentSlice.reducer;
