import 'expo-router/entry';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './src/playback/service';

// Registers the background playback service so lock-screen / notification remote
// controls keep working when the JS UI is torn down. Must run at startup, after
// the root component is registered by expo-router/entry.
TrackPlayer.registerPlaybackService(() => PlaybackService);
