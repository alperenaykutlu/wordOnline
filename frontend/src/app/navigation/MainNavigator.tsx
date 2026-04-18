import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from './types';
import { Colors } from '../../shared/constants/colors';

import { HomeScreen }            from '../../features/home/HomeScreen';
import { SoloGameScreen }        from '../../features/game/solo/SoloGameScreen';
import { EcurieGameScreen }      from '../../features/game/ecurie/EcurieGameScreen';
import { MatchmakingScreen }     from '../../features/matchmaking/MatchmakingScreen';
import { WordGiveScreen }        from '../../features/wordgive/WordGiveScreen';
import { LeaderboardScreen }     from '../../features/leaderboard/LeaderboardScreen';
import { ProfileScreen }         from '../../features/social/profile/ProfileScreen';
import { FriendsScreen }         from '../../features/social/friends/FriendsScreen';
import { AdFreeScreen }          from '../../features/payment/screens/AdFreeScreen';
import { ComplaintScreen }       from '../../features/complaint/screens/ComplaintScreen';
import { AdminDashboardScreen }  from '../../features/admin/screens/AdminDashboardScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle:      { backgroundColor: Colors.dark2 },
      headerTintColor:  Colors.cream,
      headerTitleStyle: { fontWeight: '700' },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen name="Home"           component={HomeScreen}           options={{ headerShown: false }} />
    <Stack.Screen name="SoloGame"       component={SoloGameScreen}       options={{ title: 'Tek Kişi', headerBackTitle: 'Çık' }} />
    <Stack.Screen name="EcurieGame"     component={EcurieGameScreen}     options={{ title: 'Eküri Mod', headerBackVisible: false }} />
    <Stack.Screen name="Matchmaking"    component={MatchmakingScreen}    options={{ headerShown: false }} />
    <Stack.Screen name="WordGive"       component={WordGiveScreen}       options={{ headerShown: false }} />
    <Stack.Screen name="Leaderboard"    component={LeaderboardScreen}    options={{ title: 'Liderlik' }} />
    <Stack.Screen name="Profile"        component={ProfileScreen}        options={{ title: 'Profil' }} />
    <Stack.Screen name="Friends"        component={FriendsScreen}        options={{ title: 'Arkadaşlar' }} />
    <Stack.Screen name="AdFree"         component={AdFreeScreen}         options={{ title: 'Reklamsız Deneyim' }} />
    <Stack.Screen name="Complaint"      component={ComplaintScreen}      options={{ title: 'Şikayet & Öneri' }} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Panel' }} />
  </Stack.Navigator>
);
