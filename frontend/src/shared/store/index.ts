import { configureStore } from '@reduxjs/toolkit';
import authReducer    from '../../features/auth/store/authSlice';
import paymentReducer from '../../features/payment/store/paymentSlice';

export const store = configureStore({
  reducer: {
    auth:    authReducer,
    payment: paymentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
