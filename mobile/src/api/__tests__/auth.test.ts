import { api } from '../client';
import {
  generateOidcState,
  getMe,
  getPublicOidcProviders,
  getSetupStatus,
  login,
  oidcCallback,
} from '../auth';

jest.mock('../client', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('login', () => {
  it('posts credentials and returns the response body', async () => {
    const body = { accessToken: 'tok', user: { id: 1 } };
    mockApi.post.mockResolvedValue({ data: body });

    const result = await login('alice', 'secret');

    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { username: 'alice', password: 'secret' });
    expect(result).toBe(body);
  });
});

describe('getMe', () => {
  it('gets the current user', async () => {
    const user = { id: 1, username: 'alice' };
    mockApi.get.mockResolvedValue({ data: user });

    expect(await getMe()).toBe(user);
    expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
  });
});

describe('getPublicOidcProviders', () => {
  it('returns the provider list on success', async () => {
    const providers = [{ slug: 'dex', displayName: 'Dex' }];
    mockApi.get.mockResolvedValue({ data: providers });

    expect(await getPublicOidcProviders()).toBe(providers);
    expect(mockApi.get).toHaveBeenCalledWith('/app-settings/oidc/providers/public');
  });

  it('returns an empty list when the request fails', async () => {
    mockApi.get.mockRejectedValue(new Error('network'));

    expect(await getPublicOidcProviders()).toEqual([]);
  });
});

describe('generateOidcState', () => {
  it('posts to the provider-scoped state endpoint', async () => {
    const body = { state: 'srv-state', authorizationEndpoint: 'https://idp/authorize' };
    mockApi.post.mockResolvedValue({ data: body });

    expect(await generateOidcState('dex')).toBe(body);
    expect(mockApi.post).toHaveBeenCalledWith('/auth/oidc/dex/state');
  });
});

describe('oidcCallback', () => {
  it('posts the exchange payload to the callback endpoint', async () => {
    const payload = {
      code: 'auth-code',
      codeVerifier: 'verifier',
      redirectUri: 'bookorbit://oauth2-callback',
      nonce: 'nonce',
      state: 'srv-state',
    };
    const body = { mode: 'login', accessToken: 'tok', user: { id: 1 } };
    mockApi.post.mockResolvedValue({ data: body });

    expect(await oidcCallback(payload)).toBe(body);
    expect(mockApi.post).toHaveBeenCalledWith('/auth/oidc/callback', payload);
  });
});

describe('getSetupStatus', () => {
  it('gets the setup status', async () => {
    const body = { needsSetup: false };
    mockApi.get.mockResolvedValue({ data: body });

    expect(await getSetupStatus()).toBe(body);
    expect(mockApi.get).toHaveBeenCalledWith('/auth/setup-status');
  });
});
