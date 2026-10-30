import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Card, Field, Screen, styles } from '../components/ui';
import { showAlert } from '../lib/alert';
import { addList, deleteList, renameList } from '../lib/api';
import { useHousehold } from '../lib/session';

const report = (e: unknown) => showAlert('Greška', e instanceof Error ? e.message : String(e));

export default function ListEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { code, lists, items, setActiveListId } = useHousehold();
  const existing = id ? lists.find((l) => l.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');

  const save = async () => {
    if (!name.trim()) return showAlert('Naziv', 'Upiši naziv popisa, npr. "Lidl" ili "dm".');
    try {
      if (existing) await renameList(code, existing.id, name.trim());
      else {
        const ref = await addList(code, name.trim(), Math.max(-1, ...lists.map((l) => l.order)) + 1);
        setActiveListId(ref.id);
      }
      router.back();
    } catch (e) {
      report(e);
    }
  };

  const remove = () => {
    if (!existing) return;
    if (lists.length <= 1) return showAlert('Nije moguće', 'Mora ostati barem jedan popis.');
    const count = items.filter((i) => i.listId === existing.id).length;
    showAlert('Obrisati popis?', count ? `Obrisat će se i ${count} artikala na njemu.` : existing.name, [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: () =>
          deleteList(code, existing.id)
            .then(() => router.back())
            .catch(report),
      },
    ]);
  };

  return (
    <Screen>
      <Card>
        <Field label="Naziv popisa" value={name} onChangeText={setName} placeholder="npr. Lidl, dm, Velika kupovina" autoFocus />
        <Text style={styles.muted}>Svaki popis je zaseban, npr. po trgovini. Oboje vidite sve popise.</Text>
      </Card>
      <Button title={existing ? 'Spremi' : 'Napravi popis'} onPress={save} />
      {existing && <Button title="Obriši popis" variant="danger" onPress={remove} />}
    </Screen>
  );
}
