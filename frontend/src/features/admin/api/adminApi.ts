import { apiClient } from '../../../shared/api/apiClient';

export interface DailyStats  { date: string; soloGames: number; ecurieGames: number }
export interface ComplaintItem {
  id: string; username: string; type: string;
  message: string; status: string; createdAt: string;
}
export interface DashboardData {
  totalGamesPlayed:     number;
  totalSoloGames:       number;
  totalEcurieGames:     number;
  activeRooms:          number;
  totalPlayers:         number;
  totalAdFreePurchases: number;
  openComplaints:       number;
  totalComplaints:      number;
  onlinePlayers:        number;
  recentComplaints:     ComplaintItem[];
  dailyStats:           DailyStats[];
}

export const adminApi = {
  getDashboard: async (): Promise<DashboardData> => {
    const { data } = await apiClient.get<DashboardData>('/admin/dashboard');
    return data;
  },

  getComplaints: async (status?: string, page = 1, pageSize = 20) => {
    const params: Record<string, string | number> = { page, pageSize };
    if (status) params.status = status;
    const { data } = await apiClient.get('/admin/complaints', { params });
    return data;
  },

  resolveComplaint: async (id: string, dismiss: boolean, note?: string) => {
    await apiClient.post(`/admin/complaints/${id}/resolve`, { dismiss, note });
  },
};
