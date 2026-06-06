import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { generateOidcState, oidcCallback } from './auth';
import type { OidcCallbackResponse, OidcProviderPublic } from './types';

WebBrowser.maybeCompleteAuthSession();

async function generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const codeVerifier = base64url(randomBytes);
  const challengeBytes = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64url(new Uint8Array(challengeBytes));
  return { codeVerifier, codeChallenge };
}

async function generateNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return base64url(bytes);
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function initiateOidcLogin(provider: OidcProviderPublic): Promise<OidcCallbackResponse> {
  if (!provider.enabled) {
    throw new Error('OIDC provider is not enabled');
  }

  const { codeVerifier, codeChallenge } = await generatePkce();
  const nonce = await generateNonce();

  const { state, authorizationEndpoint } = await generateOidcState(provider.slug);

  const redirectUri = Linking.createURL('oauth2-callback');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    scope: provider.scopes,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  const authUrl = `${authorizationEndpoint}?${params.toString()}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== 'success') {
    throw new Error('OIDC login was cancelled or failed');
  }

  const url = new URL(result.url);
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
