import { apiClient } from '@shared/api/apiClient';

export interface GoogleLoginResponse {
  accessToken: string;
  userId:      string;
  username:    string;
  isNewUser:   boolean;
}

export interface RefreshResponse {
  accessToken: string;
}

export const authApi = {
  googleLogin: async (idToken: string): Promise<GoogleLoginResponse> => {
    const { data } = await apiClient.post<GoogleLoginResponse>(
      '/auth/google',
      { idToken }
    );
    return data;
  },

  refresh: async (): Promise<RefreshResponse> => {
    const { data } = await apiClient.post<RefreshResponse>('/auth/refresh');
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  changeUsername: async (newUsername: string) => {
    const { data } = await apiClient.patch('/auth/username', { newUsername });
    return data;
  },
};
