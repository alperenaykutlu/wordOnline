import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = { Auth: undefined; Main: undefined; Splash: undefined; Onboarding: undefined; };

export type AuthStackParamList = { Login: undefined; };

export type MainStackParamList = {
  Home:           undefined;
  SoloGame:       { wordLength: number };
  EcurieGame:     { roomId: string; mode: 'sameWord' | 'giveWord' };
  Matchmaking:    { mode: 'sameWord' | 'giveWord' };
  WordGive:       { roomId: string; opponentName?: string; round?: number };
  Leaderboard:    undefined;
  Profile:        { userId?: string };
  Friends:        undefined;
  AdFree:         undefined;
  Complaint:      undefined;
  AdminDashboard: undefined;
};

export type SoloGameScreenProps      = NativeStackScreenProps<MainStackParamList, 'SoloGame'>;
export type EcurieGameScreenProps    = NativeStackScreenProps<MainStackParamList, 'EcurieGame'>;
export type MatchmakingScreenProps   = NativeStackScreenProps<MainStackParamList, 'Matchmaking'>;
export type WordGiveScreenProps      = NativeStackScreenProps<MainStackParamList, 'WordGive'>;
export type ProfileScreenProps       = NativeStackScreenProps<MainStackParamList, 'Profile'>;
