import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { generateOidcState, oidcCallback } from './auth';
import type { OidcCallbackResponse, OidcProviderPublic } from './types';

WebBrowser.maybeCompleteAuthSession();

/**
 * Raised when the user dismisses or cancels the OIDC browser session. Distinct from a
 * genuine failure so the UI can stay silent on cancellation while still surfacing real
 * errors (provider errors, state mismatch, network failures).
 */
export class OidcCancelledError extends Error {
  constructor(message = 'OIDC login was cancelled') {
    super(message);
    this.name = 'OidcCancelledError';
  }
}

export function isOidcCancelled(error: unknown): boolean {
  return error instanceof OidcCancelledError;
}

export function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const codeVerifier = base64url(randomBytes);
  const challengeBytes = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64url(new Uint8Array(challengeBytes));
  return { codeVerifier, codeChallenge };
}

export async function generateNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return base64url(bytes);
}

/**
 * The deep-link URI the IdP redirects back to after authentication. This exact string is
 * sent both to the provider (as `redirect_uri`) and to the server's `/auth/oidc/callback`,
 * so it must match the redirect URI whitelisted on the server (`OIDC_MOBILE_REDIRECT_URIS`,
 * default `bookorbit://oauth2-callback`) and at the provider. In a dev/standalone build the
 * app scheme (`bookorbit`) yields `bookorbit://oauth2-callback`; inside Expo Go it resolves
 * to an `exp://` URL that the whitelist rejects — which is why OIDC needs a dev build.
 */
export function getRedirectUri(): string {
  return Linking.createURL('oauth2-callback');
}

export interface AuthUrlParts {
  authorizationEndpoint: string;
  state: string;
  codeChallenge: string;
  nonce: string;
  redirectUri: string;
}

export function buildAuthUrl(provider: OidcProviderPublic, parts: AuthUrlParts): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: parts.redirectUri,
    scope: provider.scopes,
    code_challenge: parts.codeChallenge,
    code_challenge_method: 'S256',
    state: parts.state,
    nonce: parts.nonce,
  });
  return `${parts.authorizationEndpoint}?${params.toString()}`;
}

export async function initiateOidcLogin(provider: OidcProviderPublic): Promise<OidcCallbackResponse> {
  if (!provider.enabled) {
    throw new Error('OIDC provider is not enabled');
  }

  const { codeVerifier, codeChallenge } = await generatePkce();
  const nonce = await generateNonce();

  // The server mints and stores the `state` (CSRF) and resolves the provider's authorize
  // endpoint via discovery; the client only echoes them back.
  const { state, authorizationEndpoint } = await generateOidcState(provider.slug);

  const redirectUri = getRedirectUri();
  const authUrl = buildAuthUrl(provider, { authorizationEndpoint, state, codeChallenge, nonce, redirectUri });

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new OidcCancelledError();
  }
  if (result.type !== 'success') {
    throw new Error('OIDC login could not open a browser session');
  }

  const url = new URL(result.url);
  const oidcError = url.searchParams.get('error');
  if (oidcError) {
    const description = url.searchParams.get('error_description');
    throw new Error(`OIDC provider returned an error: ${description ?? oidcError}`);
  }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  if (!code || !returnedState) {
    throw new Error('Missing code or state in OIDC callback');
  }
  if (returnedState !== state) {
    throw new Error('OIDC state mismatch');
  }

  return oidcCallback({ code, codeVerifier, redirectUri, nonce, state });
}
