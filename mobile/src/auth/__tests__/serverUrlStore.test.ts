import { serverUrlStore } from '../serverUrlStore';

describe('serverUrlStore', () => {
  afterEach(() => {
    serverUrlStore.set(null);
  });

  it('defaults to null', () => {
    expect(serverUrlStore.get()).toBeNull();
  });

  it('stores and returns the configured server URL', () => {
    serverUrlStore.set('https://library.example.com');
    expect(serverUrlStore.get()).toBe('https://library.example.com');
  });

  it('can be cleared back to null', () => {
    serverUrlStore.set('https://library.example.com');
    serverUrlStore.set(null);
    expect(serverUrlStore.get()).toBeNull();
  });
});
