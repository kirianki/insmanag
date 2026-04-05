// services/analyticsService.ts

import { api } from '@/lib/api';
import { AnalyticsDashboardResponse, AgentThresholdProgressResponse } from '@/types/api';

export interface AnalyticsFilterParams {
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  agent_id?: string;
  branch_id?: string;
}

export const getDashboardAnalytics = (params: AnalyticsFilterParams = {}) => {
  return api.get<AnalyticsDashboardResponse>('/analytics/dashboard/', { params });
};

export const getProductionThresholdProgress = (agentId?: string) => {
  const params = agentId ? { agent_id: agentId } : {};
  return api.get<AgentThresholdProgressResponse | AgentThresholdProgressResponse[]>('/analytics/production-threshold/', { params });
};