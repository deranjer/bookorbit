import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { generateOidcState, oidcCallback } from '../auth';
import {
  base64url,
  buildAuthUrl,
  generateNonce,
  generatePkce,
  initiateOidcLogin,
  isOidcCancelled,
} from '../oidc';
import type { OidcProviderPublic } from '../types';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytesAsync: jest.fn(),
  digest: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('../auth', () => ({
  generateOidcState: jest.fn(),
  oidcCallback: jest.fn(),
}));

const mockCrypto = Crypto as jest.Mocked<typeof Crypto>;
const mockLinking = Linking as jest.Mocked<typeof Linking>;
const mockBrowser = WebBrowser as jest.Mocked<typeof WebBrowser>;
const mockGenerateState = generateOidcState as jest.Mock;
const mockOidcCallback = oidcCallback as jest.Mock;

const REDIRECT_URI = 'bookorbit://oauth2-callback';

const provider: OidcProviderPublic = {
  slug: 'dex',
  displayName: 'Dex (Dev)',
  enabled: true,
  iconUrl: null,
  clientId: 'bookorbit-mobile',
  scopes: 'openid profile email',
};

beforeEach(() => {
  jest.clearAllMocks();
  // Deterministic randomness: fill the requested number of bytes with a constant.
  mockCrypto.getRandomBytesAsync.mockImplementation(async (length: number) =>
    new Uint8Array(length).fill(7),
  );
  mockCrypto.digest.mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer as ArrayBuffer);
  mockLinking.createURL.mockReturnValue(REDIRECT_URI);
});

describe('base64url', () => {
  it('produces URL-safe output without padding', () => {
    // Standard base64 of [0xfb, 0xff, 0xbf] is "+/+/", which must be rewritten to "-_-_".
    expect(base64url(new Uint8Array([0xfb, 0xff, 0xbf]))).toBe('-_-_');
  });

  it('encodes simple bytes correctly', () => {
    expect(base64url(new Uint8Array([1, 2, 3]))).toBe('AQID');
  });

  it('strips "=" padding', () => {
    const out = base64url(new Uint8Array([1]));
    expect(out).not.toMatch(/[+/=]/);
  });
});

describe('generatePkce', () => {
  it('derives the challenge as base64url(sha256(verifier))', async () => {
    const { codeVerifier, codeChallenge } = await generatePkce();

    expect(codeVerifier).toBe(base64url(new Uint8Array(32).fill(7)));
    expect(codeChallenge).toBe(base64url(new Uint8Array([1, 2, 3, 4])));
    // Both must be URL-safe.
    expect(codeVerifier).not.toMatch(/[+/=]/);
    expect(codeChallenge).not.toMatch(/[+/=]/);
    expect(mockCrypto.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
  });
});

describe('generateNonce', () => {
  it('returns a non-empty URL-safe string', async () => {
    const nonce = await generateNonce();
    expect(nonce.length).toBeGreaterThan(0);
    expect(nonce).not.toMatch(/[+/=]/);
    expect(mockCrypto.getRandomBytesAsync).toHaveBeenCalledWith(16);
  });
});

describe('buildAuthUrl', () => {
  it('assembles the authorization request with all required params', () => {
    const url = new URL(
      buildAuthUrl(provider, {
        authorizationEndpoint: 'https://idp.example/authorize',
        state: 'srv-state',
        codeChallenge: 'challenge123',
        nonce: 'nonce123',
        redirectUri: REDIRECT_URI,
      }),
    );

    expect(`${url.origin}${url.pathname}`).toBe('https://idp.example/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('bookorbit-mobile');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(url.searchParams.get('scope')).toBe('openid profile email');
    expect(url.searchParams.get('code_challenge')).toBe('challenge123');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('srv-state');
    expect(url.searchParams.get('nonce')).toBe('nonce123');
  });
});

describe('initiateOidcLogin', () => {
  function mockStateResponse() {
    mockGenerateState.mockResolvedValue({
      state: 'srv-state',
      authorizationEndpoint: 'https://idp.example/authorize',
    });
  }

  it('exchanges the code with the server on success', async () => {
    mockStateResponse();
    mockBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: `${REDIRECT_URI}?code=auth-code&state=srv-state`,
    });
    const callbackResult = { mode: 'login', accessToken: 'tok', user: { id: 1 } };
    mockOidcCallback.mockResolvedValue(callbackResult);

    const result = await initiateOidcLogin(provider);

    expect(result).toBe(callbackResult);
    expect(mockOidcCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'auth-code',
        state: 'srv-state',
        redirectUri: REDIRECT_URI,
        codeVerifier: expect.any(String),
        nonce: expect.any(String),
      }),
    );
    // Server-issued state and client redirect URI flow through unchanged.
    expect(mockBrowser.openAuthSessionAsync).toHaveBeenCalledWith(expect.any(String), REDIRECT_URI);
  });

  it('throws a cancellation error when the browser is cancelled', async () => {
    mockStateResponse();
    mockBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'cancel',
    } as WebBrowser.WebBrowserAuthSessionResult);

    const error = await initiateOidcLogin(provider).catch((e) => e);
    expect(isOidcCancelled(error)).toBe(true);
    expect(mockOidcCallback).not.toHaveBeenCalled();
  });

  it('throws a cancellation error when the browser is dismissed', async () => {
    mockStateResponse();
    mockBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'dismiss',
    } as WebBrowser.WebBrowserAuthSessionResult);

    const error = await initiateOidcLogin(provider).catch((e) => e);
    expect(isOidcCancelled(error)).toBe(true);
  });

  it('surfaces a real error (not a cancellation) when code is missing', async () => {
    mockStateResponse();
    mockBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: `${REDIRECT_URI}?state=srv-state`,
    });

    const error = await initiateOidcLogin(provider).catch((e) => e);
    expect(isOidcCancelled(error)).toBe(false);
    expect(error.message).toMatch(/Missing code or state/);
  });

  it('rejects when the returned state does not match', async () => {
    mockStateResponse();
    mockBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: `${REDIRECT_URI}?code=auth-code&state=tampered`,
    });

    await expect(initiateOidcLogin(provider)).rejects.toThrow(/state mismatch/);
    expect(mockOidcCallback).not.toHaveBeenCalled();
  });

  it('surfaces a provider error returned on the redirect', async () => {
    mockStateResponse();
    mockBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: `${REDIRECT_URI}?error=access_denied&error_description=User%20declined`,
    });

    await expect(initiateOidcLogin(provider)).rejects.toThrow(/User declined/);
  });

  it('refuses a disabled provider before opening the browser', async () => {
    await expect(initiateOidcLogin({ ...provider, enabled: false })).rejects.toThrow(/not enabled/);
    expect(mockBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
    expect(mockGenerateState).not.toHaveBeenCalled();
  });
});
