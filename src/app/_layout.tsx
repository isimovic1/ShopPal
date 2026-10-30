import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SetupNeeded } from '../components/SetupNeeded';
import { isFirebaseConfigured } from '../lib/firebaseConfig';
import { SessionProvider, useSession } from '../lib/session';
import { colors } from '../theme';

function RootNavigator() {
  const { ready, profile } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const inHousehold = Boolean(profile?.code);
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!inHousehold}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={inHousehold}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="item" options={{ title: 'Artikl', presentation: 'modal' }} />
        <Stack.Screen name="list-edit" options={{ title: 'Popis', presentation: 'modal' }} />
        <Stack.Screen name="suggestions" options={{ title: 'Prijedlozi' }} />
        <Stack.Screen name="bill" options={{ title: 'Račun', presentation: 'modal' }} />
        <Stack.Screen name="bill-amount" options={{ title: 'Iznos za mjesec', presentation: 'modal' }} />
        <Stack.Screen name="task" options={{ title: 'Posao', presentation: 'modal' }} />
        <Stack.Screen name="meal" options={{ title: 'Jelo' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* Without a Firebase project there is nothing to sync with; explain instead of crashing. */}
      {isFirebaseConfigured() ? (
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      ) : (
        <SetupNeeded />
      )}
    </SafeAreaProvider>
  );
}
