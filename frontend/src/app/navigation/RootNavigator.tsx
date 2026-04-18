import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';

import { SplashScreen }     from '../../features/splash/SplashScreen';
import { OnboardingScreen } from '../../features/onboarding/OnboardingScreen';
import { AuthNavigator }    from './AuthNavigator';
import { MainNavigator }    from './MainNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // Navigator animasyonunu kapatıyoruz.
          // Splash → Onboarding geçişini biz Animated API ile yönetiyoruz.
          // Kendi animasyonumuz + Navigator animasyonu çakışırsa sert geçiş görünür.
          animation: 'none',
        }}
      >
        <Stack.Screen name="Splash"     component={SplashScreen}     />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
