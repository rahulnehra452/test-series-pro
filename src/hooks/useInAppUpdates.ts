import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export function useInAppUpdates() {
  useEffect(() => {
    async function checkUpdates() {
      try {
        if (__DEV__) return; // Don't run in dev mode

        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          const fetchWaitPromise = new Promise((resolve) => {
            Alert.alert(
              'Update Available',
              'A new version of the app is available. Downloading now...',
              [{ text: 'OK', onPress: resolve }]
            );
          });

          await fetchWaitPromise;
          await Updates.fetchUpdateAsync();

          Alert.alert(
            'Update Ready',
            'The app needs to restart to apply the update.',
            [{
              text: 'Restart',
              onPress: async () => {
                await Updates.reloadAsync();
              }
            }]
          );
        }
      } catch (error) {
        // Fail silently in production, valid updates usually work
        console.log('Error checking for updates:', error);
      }
    }

    checkUpdates();
  }, []);
}
