let serverUrl: string | null = null;

export const serverUrlStore = {
  get: () => serverUrl,
  set: (value: string | null) => {
    serverUrl = value;
  },
};
