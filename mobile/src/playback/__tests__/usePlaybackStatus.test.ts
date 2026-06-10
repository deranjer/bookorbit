import { State } from 'react-native-track-player';
import { derivePlaybackStatus } from '../usePlaybackStatus';

// Mock the native module so importing usePlaybackStatus doesn't pull in RNTP's
// native code. derivePlaybackStatus only needs the State string enum. (jest.mock is
// hoisted above the imports by babel-plugin-jest-hoist.)
jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {},
  State: {
    None: 'none',
    Ready: 'ready',
    Playing: 'playing',
    Paused: 'paused',
    Stopped: 'stopped',
    Loading: 'loading',
    Buffering: 'buffering',
    Error: 'error',
    Ended: 'ended',
  },
}));

describe('derivePlaybackStatus', () => {
  it('is playing when playWhenReady and actively playing', () => {
    expect(derivePlaybackStatus(true, State.Playing)).toEqual({ playing: true, buffering: false });
  });

  it('shows buffering only while buffering during play', () => {
    expect(derivePlaybackStatus(true, State.Buffering)).toEqual({ playing: true, buffering: true });
    expect(derivePlaybackStatus(true, State.Loading)).toEqual({ playing: true, buffering: true });
    // Buffering while NOT intending to play is not "buffering during play".
    expect(derivePlaybackStatus(false, State.Buffering)).toEqual({ playing: false, buffering: false });
  });

  it('is not playing when paused (playWhenReady false)', () => {
    expect(derivePlaybackStatus(false, State.Paused)).toEqual({ playing: false, buffering: false });
  });

  it('is not playing on ended/error/none even if playWhenReady', () => {
    expect(derivePlaybackStatus(true, State.Ended).playing).toBe(false);
    expect(derivePlaybackStatus(true, State.Error).playing).toBe(false);
    expect(derivePlaybackStatus(true, State.None).playing).toBe(false);
  });

  it('defaults to not-playing while state is unknown', () => {
    expect(derivePlaybackStatus(true, undefined)).toEqual({ playing: false, buffering: false });
  });
});
