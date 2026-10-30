import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';
import { Card, styles } from './ui';

/** Shown when src/lib/firebaseConfig.ts still has the empty placeholder values. */
export function SetupNeeded() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xl }}>
          <Ionicons name="cloud-offline-outline" size={56} color={colors.primary} />
          <Text style={styles.h1}>ShopPal još nije povezan</Text>
        </View>
        <Card>
          <Text style={styles.text}>
            Zajednički popis živi u Firebaseu, a ova verzija aplikacije još nema upisane postavke Firebase projekta.
          </Text>
          <Text style={styles.muted}>
            Postavke se upisuju u src/lib/firebaseConfig.ts (upute u FIREBASE_SETUP.md), nakon čega treba napraviti novu
            verziju aplikacije.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
