import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';

import { Button, Card, Field, Row, Screen, styles } from '../../components/ui';
import { leaveHousehold, renameMember } from '../../lib/api';
import { useHousehold } from '../../lib/session';
import { colors, spacing } from '../../theme';

const report = (e: unknown) => Alert.alert('Greška', e instanceof Error ? e.message : String(e));

export default function HouseholdScreen() {
  const { code, me, household, lists, profile, saveProfile } = useHousehold();
  const [name, setName] = useState(me.name);

  const share = () =>
    Share.share({
      message: `Pridruži se našem popisu za kupovinu u aplikaciji ShopPal: otvori aplikaciju, upiši ime i kod ${code}.`,
    }).catch(() => {});

  const rename = async () => {
    const n = name.trim();
    if (!n) return;
    try {
      await renameMember(code, { uid: me.uid, name: n });
      await saveProfile({ name: n, code });
    } catch (e) {
      report(e);
    }
  };

  const leave = () =>
    Alert.alert('Napustiti kućanstvo?', 'Popisi ostaju drugima. Vratiti se možeš opet s istim kodom.', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Napusti',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveHousehold(code, me.uid);
          } catch (e) {
            report(e);
          }
          await saveProfile({ name: profile?.name ?? me.name, code: null });
        },
      },
    ]);

  return (
    <Screen>
      <Card title="Kod kućanstva">
        <Text style={{ fontSize: 36, fontWeight: '800', letterSpacing: 6, color: colors.primary, textAlign: 'center' }}>{code}</Text>
        <Text style={[styles.muted, { textAlign: 'center' }]}>Druga osoba ga upiše pri prvom pokretanju aplikacije.</Text>
        <Button title="Pošalji kod" onPress={share} />
      </Card>

      <Card title="Članovi">
        {Object.entries(household?.members ?? {}).map(([uid, n]) => (
          <Row key={uid} style={{ justifyContent: 'space-between' }}>
            <Text style={styles.text}>{n}</Text>
            {uid === me.uid && <Text style={styles.muted}>ti</Text>}
          </Row>
        ))}
      </Card>

      <Card title="Tvoje ime">
        <Row style={{ alignItems: 'flex-end' }}>
          <Field label="Ime" value={name} onChangeText={setName} />
          <Button title="Spremi" variant="secondary" onPress={rename} style={{ paddingVertical: 10 }} />
        </Row>
      </Card>

      <Card title="Popisi">
        {lists.map((l) => (
          <Pressable key={l.id} onPress={() => router.push({ pathname: '/list-edit', params: { id: l.id } })}>
            <View style={{ paddingVertical: spacing.xs }}>
              <Text style={styles.text}>{l.name}</Text>
            </View>
          </Pressable>
        ))}
        <Button title="+ Nova lista" variant="secondary" onPress={() => router.push('/list-edit')} />
      </Card>

      <Button title="Napusti kućanstvo" variant="ghost" onPress={leave} />
    </Screen>
  );
}
