# BookOrbit Mobile

React Native / Expo mobile client for BookOrbit.

**Screens:** server setup → login (username/password + OIDC (unit-tested; on-device E2E pending)) → dashboard, libraries, smart scopes, search.

## Requirements

- Node 20+
- [Expo Go](https://expo.dev/go) on your device **or** a local dev build (required for OIDC deep links)
- A running BookOrbit server reachable from your device/emulator

## Setup

```bash
cd mobile
npm install
```

## Running

```bash
npx expo start
```

Scan the QR code with Expo Go (iOS Camera / Expo Go on Android), or press `a` for Android emulator / `i` for iOS simulator.

> **OIDC note:** `expo-web-browser` deep links (`bookorbit://oauth2-callback`) do not work inside Expo Go — you need a [dev build](https://docs.expo.dev/develop/development-builds/introduction/). Password login works in Expo Go.

### Dev build (needed for OIDC)

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

## Testing OIDC locally with Dex

1. **Start the Dex OIDC provider** (from the repo root):

   ```bash
   docker compose -f docker-compose.oidc.yml up -d
   ```

   Dex runs on `http://localhost:5556/dex`. The static config lives at `scripts/dex-config.yaml`.

2. **Start the BookOrbit server** with local issuers allowed:

   ```bash
   OIDC_ALLOW_LOCAL_ISSUERS=true pnpm dev
   ```

3. **Register the Dex provider** in the BookOrbit admin settings (`/settings/admin` → OIDC tab → Add Provider):

   | Field          | Value                                           |
   | -------------- | ----------------------------------------------- |
   | Slug           | `dex`                                           |
   | Display Name   | `Dex (Dev)`                                     |
   | Issuer URI     | `http://<host-ip>:5556/dex`                     |
   | Client ID      | `bookorbit-mobile`                              |
   | Scopes         | `openid profile email`                          |
   | Client Secret  | _(leave blank — public client)_                 |
   | Auto-provision | Enable if you want users created on first login |

   Use your machine's LAN IP (not `localhost`) so the mobile device can reach it.

4. **Start the mobile app** (dev build):

   ```bash
   cd mobile && npx expo start
   ```

5. On the login screen, enter your server URL (`http://<host-ip>:3000`), then tap the **Dex (Dev)** provider button. The system browser opens Dex, you log in with:
   - **Email:** `dev@bookorbit.local`
   - **Password:** `password`

   After authentication, the browser redirects to `bookorbit://oauth2-callback` and the app completes the exchange.

## Configuration

### `OIDC_MOBILE_REDIRECT_URIS` (server env var)

By default the server allows `bookorbit://oauth2-callback` as a redirect URI for the OIDC callback. If you use a custom app scheme (e.g. for a white-label build), set:

```bash
OIDC_MOBILE_REDIRECT_URIS=myapp://oauth2-callback,bookorbit://oauth2-callback
```

Multiple URIs are comma-separated.

## Project structure

```
mobile/
├── app/                        # expo-router pages
│   ├── _layout.tsx             # Root layout (AuthProvider + QueryClientProvider)
│   ├── index.tsx               # Redirect: setup → login → dashboard
│   ├── server-setup.tsx        # Server URL entry screen
│   ├── login.tsx               # Username/password + OIDC provider buttons
│   ├── search.tsx              # Global search overlay
│   └── (drawer)/
│       ├── _layout.tsx         # Drawer navigation + auth guard
│       └── (tabs)/
│           ├── _layout.tsx     # Bottom tab bar
│           ├── index.tsx       # Dashboard (continue reading, recently added)
│           ├── libraries.tsx   # Library selector + book grid
│           └── smart-scopes.tsx # Smart scope selector + book grid
├── src/
│   ├── api/
│   │   ├── types.ts            # Local response type mirrors
│   │   ├── client.ts           # Axios instance (base URL, Bearer token, 401 refresh)
│   │   ├── auth.ts             # Login, OIDC state/callback, setup-status
│   │   ├── oidc.ts             # PKCE generation + WebBrowser OIDC flow
│   │   ├── books.ts            # searchBooks
│   │   ├── libraries.ts        # getLibraries, getLibraryBooks
│   │   ├── dashboard.ts        # getScroller
│   │   └── smartScopes.ts      # getSmartScopes, getSmartScopeBooks
│   ├── auth/
│   │   ├── storage.ts          # expo-secure-store wrapper (web fallback)
│   │   ├── tokenStore.ts       # In-memory token + 401 logout callback
│   │   └── serverUrlStore.ts   # In-memory server URL
│   ├── components/
│   │   └── BookCard.tsx        # Cover + title/authors + format badge + progress bar
│   ├── constants/
│   │   └── colors.ts           # Dark theme color palette
│   └── context/
│       └── AuthContext.tsx      # Auth state + secure-store persistence
├── assets/images/              # App icons
├── app.json                    # Expo config (slug: bookorbit, scheme: bookorbit)
├── index.ts                    # Entry point
├── metro.config.js
├── tsconfig.json
└── package.json
```

## Key API differences from the litara mobile app

| Feature         | Litara                         | BookOrbit                                      |
| --------------- | ------------------------------ | ---------------------------------------------- |
| Login body      | `{ email, password }`          | `{ username, password }`                       |
| Token field     | `access_token`                 | `accessToken`                                  |
| User ID type    | `string`                       | `number`                                       |
| Library books   | `GET /books?libraryId=`        | `POST /libraries/:id/books` with `BookQuery`   |
| Dashboard       | Single endpoint                | `GET /dashboard/scrollers/:type`               |
| Smart shelves   | `GET /smart-shelves/:id/books` | `GET /smart-scopes/:id/books?page&size`        |
| Cover auth      | Not required                   | Bearer token required (`Authorization` header) |
| Book result key | `books`                        | `items` (in `BooksPage`)                       |

## Out of scope (future)

- EPUB reader
- Audiobook/podcast playback
- Book detail screen & actions
- Annotations, collections, series/authors browse
- Offline / downloads
- EAS production build config
