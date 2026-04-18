import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { googleLogin, logout } from '../store/authSlice';
import type { AppDispatch, RootState } from '@shared/store';

// GoogleSignin.configure() — App.tsx içinde çağrılmalı
// GoogleSignin.configure({ webClientId: 'YOUR_WEB_CLIENT_ID' });

export const useGoogleAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated, username } = useSelector(
    (s: RootState) => s.auth
  );

  const signIn = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.idToken) throw new Error('ID token alınamadı.');

      await dispatch(googleLogin(userInfo.idToken)).unwrap();
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Kullanıcı girişi iptal etti.');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        console.log('Giriş işlemi devam ediyor.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.error('Google Play Services mevcut değil.');
      } else {
        console.error('Google giriş hatası:', err);
      }
    }
  }, [dispatch]);

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch { /* ignore */ }
    await dispatch(logout());
  }, [dispatch]);

  return { signIn, signOut, loading, error, isAuthenticated, username };
};
