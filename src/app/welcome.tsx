import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field, KeyboardAware, styles } from '../components/ui';
import { showAlert } from '../lib/alert';
import { createHousehold, joinHousehold } from '../lib/api';
import { CODE_LENGTH, cleanCode, isValidCode } from '../lib/household';
import { useSession } from '../lib/session';
import { colors, spacing } from '../theme';

export default function Welcome() {
  const { uid, profile, saveProfile, error } = useSession();
  const [name, setName] = useState(profile?.name ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: 'create' | 'join') => {
    if (!uid) return showAlert('Nema veze', error ?? 'Prijava još nije gotova. Provjeri internet i pokušaj ponovo.');
    if (!name.trim()) return showAlert('Ime', 'Upiši svoje ime, da drugi vidi tko je što dodao.');
    const me = { uid, name: name.trim() };
    if (action === 'join' && !isValidCode(cleanCode(code))) {
      return showAlert('Kod', `Kod ima ${CODE_LENGTH} znakova, npr. K7P2QX.`);
    }
    setBusy(true);
    try {
      const householdCode = action === 'create' ? await createHousehold(me) : await joinHousehold(code, me);
      await saveProfile({ name: me.name, code: householdCode });
    } catch (e) {
      showAlert('Nije uspjelo', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAware>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: spacing.xs, marginVertical: spacing.lg }}>
            <Text style={styles.h1}>ShopPal 🛒</Text>
            <Text style={styles.muted}>
              Zajednički popis za kupovinu: što god jedno od vas upiše, drugo odmah vidi na svom mobitelu.
            </Text>
          </View>
          <Card title="Tvoje ime">
            <Field label="Kako da te drugi vidi" value={name} onChangeText={setName} placeholder="npr. Ivan" />
          </Card>
          <Card title="Novo kućanstvo">
            <Text style={styles.muted}>Napravi kućanstvo i pošalji kod drugoj osobi.</Text>
            <Button title="Napravi kućanstvo" onPress={() => run('create')} disabled={busy} />
          </Card>
          <Card title="Već imate kućanstvo?">
            <Field
              label="Kod kućanstva"
              value={code}
              onChangeText={(t) => setCode(cleanCode(t).slice(0, CODE_LENGTH))}
              placeholder="npr. K7P2QX"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Button title="Pridruži se kodom" variant="secondary" onPress={() => run('join')} disabled={busy} />
          </Card>
          {busy && <ActivityIndicator color={colors.primary} />}
          {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        </ScrollView>
      </KeyboardAware>
    </SafeAreaView>
  );
}
