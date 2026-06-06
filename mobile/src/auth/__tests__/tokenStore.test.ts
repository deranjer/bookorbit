import { tokenStore } from '../tokenStore';

describe('tokenStore', () => {
  beforeEach(() => {
    // Reset module-level state between tests by clearing the callback and token.
    tokenStore.registerLogoutCallback(null);
    tokenStore.set(null);
  });

  it('stores and returns the token', () => {
    tokenStore.set('abc');
    expect(tokenStore.get()).toBe('abc');
  });

  it('fires the logout callback only on a real authenticated -> signed-out transition', () => {
    const onLogout = jest.fn();
    tokenStore.registerLogoutCallback(onLogout);

    tokenStore.set('abc');
    expect(onLogout).not.toHaveBeenCalled();

    tokenStore.set(null);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('does not fire the logout callback when clearing an already-null token', () => {
    const onLogout = jest.fn();
    tokenStore.registerLogoutCallback(onLogout);

    tokenStore.set(null);
    expect(onLogout).not.toHaveBeenCalled();
  });
});
