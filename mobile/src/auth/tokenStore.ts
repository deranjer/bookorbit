type LogoutCallback = (() => void) | null;

let token: string | null = null;
let logoutCallback: LogoutCallback = null;

export const tokenStore = {
  get: () => token,
  set: (value: string | null) => {
    const wasAuthenticated = token !== null;
    token = value;
    // Only fire the logout callback on a real transition from authenticated to
    // signed-out. Firing on every null-set caused an infinite loop: the callback
    // runs clearToken(), which calls set(null) again, re-firing the callback.
    if (value === null && wasAuthenticated && logoutCallback) {
      logoutCallback();
    }
  },
  registerLogoutCallback: (cb: LogoutCallback) => {
    logoutCallback = cb;
  },
};
