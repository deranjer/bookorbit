import { api } from './client';
import type { LoginResponse, OidcCallbackResponse, OidcProviderPublic, OidcStateResponse, SetupStatus } from './types';

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { username, password });
  return data;
}

export async function getMe(): Promise<LoginResponse['user']> {
  const { data } = await api.get<LoginResponse['user']>('/auth/me');
  return data;
}

export async function getPublicOidcProviders(): Promise<OidcProviderPublic[]> {
  try {
    const { data } = await api.get<OidcProviderPublic[]>('/app-settings/oidc/providers/public');
    return data;
  } catch {
    return [];
  }
}

export async function generateOidcState(slug: string): Promise<OidcStateResponse> {
  const { data } = await api.post<OidcStateResponse>(`/auth/oidc/${slug}/state`);
  return data;
}

export async function oidcCallback(payload: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  nonce: string;
  state: string;
}): Promise<OidcCallbackResponse> {
  const { data } = await api.post<OidcCallbackResponse>('/auth/oidc/callback', payload);
  return data;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const { data } = await api.get<SetupStatus>('/auth/setup-status');
  return data;
}
