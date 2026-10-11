import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// The app's whole sound vocabulary: one chime, for a round ending and a level up.
// It respects the silent switch and mixes with whatever the user is listening to: it never stops
// their music to celebrate a round.
const CHIME = require('../../assets/sounds/chime.wav');

let player: AudioPlayer | null = null;
let configured = false;

/** Fire-and-forget. Failures (no audio device, autoplay blocked on web) are ignored. */
export function chime(): void {
  try {
    if (!configured) {
      configured = true;
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    player ??= createAudioPlayer(CHIME);
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // A missing chime is never worth an error.
  }
}
