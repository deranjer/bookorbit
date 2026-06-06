import { api } from './client';

export interface AppInfoResponse {
  version: string;
  updateAvailable: boolean | null;
  latestVersion: string | null;
  bookDockPath: string;
}

export async function getAppInfo(): Promise<AppInfoResponse> {
  const { data } = await api.get<AppInfoResponse>('/app-info');
  return data;
}
