import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Background playback service. Runs independently of the JS UI so lock-screen,
 * notification and headset remote controls keep driving the player. Registered in
 * index.ts via TrackPlayer.registerPlaybackService. Mirrors the Media Session
 * handlers in the web player's AudiobookReaderView.vue.
 */
export async function PlaybackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    void TrackPlayer.skipToNext().catch(() => {});
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    void TrackPlayer.skipToPrevious().catch(() => {});
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    void TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({ interval }) => {
    const { position, duration } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.min(duration || position + interval, position + interval));
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({ interval }) => {
    const { position } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(0, position - interval));
  });

  // Audio interruptions (calls, other apps). autoHandleInterruptions covers most
  // cases, but honour explicit duck events too.
  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }) => {
    if (permanent) {
      await TrackPlayer.pause();
      return;
    }
    if (paused) await TrackPlayer.pause();
    else await TrackPlayer.play();
  });
}
