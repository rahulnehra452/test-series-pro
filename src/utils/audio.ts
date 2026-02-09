import { Audio } from 'expo-av';

class AudioService {
  private successSound: Audio.Sound | null = null;
  private failureSound: Audio.Sound | null = null;
  private completeSound: Audio.Sound | null = null;

  async loadSounds() {
    try {
      // In a real app, you would require the assets here.
      // const { sound: s1 } = await Audio.Sound.createAsync(require('../assets/sounds/success.mp3'));
      // this.successSound = s1;
      // const { sound: s2 } = await Audio.Sound.createAsync(require('../assets/sounds/failure.mp3'));
      // this.failureSound = s2;

      // Since files likely don't exist yet, we just prepare the audio mode.
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

    } catch (error) {
      console.log('Error loading sounds:', error);
    }
  }

  async playSuccess() {
    try {
      if (this.successSound) {
        await this.successSound.replayAsync();
      } else {
        // Fallback or attempt to load dynamically if we had a URI
        // For now, valid implementation awaits file existence
        console.log('Audio: Success (File missing)');
      }
    } catch (error) {
      console.log('Error playing success sound:', error);
    }
  }

  async playFailure() {
    try {
      if (this.failureSound) {
        await this.failureSound.replayAsync();
      } else {
        console.log('Audio: Failure (File missing)');
      }
    } catch (error) {
      console.log('Error playing failure sound:', error);
    }
  }
}

export const audio = new AudioService();
