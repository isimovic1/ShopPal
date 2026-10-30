import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, Field, Screen, styles } from '../components/ui';
import { deleteItem, updateItem } from '../lib/api';
import { CATEGORIES } from '../lib/household';
import { useHousehold } from '../lib/session';
import { colors, spacing } from '../theme';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { code, items, lists } = useHousehold();
  const item = items.find((i) => i.id === id);
  const [name, setName] = useState(item?.name ?? '');
  const [note, setNote] = useState(item?.note ?? '');
  const [category, setCategory] = useState(item?.category ?? 'Ostalo');
  const [listId, setListId] = useState(item?.listId ?? '');

  if (!item) {
    return (
      <Screen>
        <Text style={styles.muted}>Artikl više ne postoji (možda ga je netko obrisao).</Text>
      </Screen>
    );
  }

  const save = () => {
    if (!name.trim()) return Alert.alert('Naziv', 'Upiši naziv artikla.');
    updateItem(code, item.id, { name: name.trim(), note: note.trim(), category, listId })
      .then(() => router.back())
      .catch((e) => Alert.alert('Greška', String(e)));
  };

  const remove = () =>
    deleteItem(code, item.id)
      .then(() => router.back())
      .catch((e) => Alert.alert('Greška', String(e)));

  return (
    <Screen>
      <Card>
        <Field label="Naziv" value={name} onChangeText={setName} />
        <Field label="Napomena (količina, marka…)" value={note} onChangeText={setNote} placeholder="npr. 2 kom, Dukat 2,8%" />
        <Text style={[styles.muted, { fontSize: 12 }]}>
          Dodao/la {item.addedByName}, {new Date(item.addedAt).toLocaleString('hr-HR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Card>
      <Card title="Odjel u trgovini">
        <Chips options={[...CATEGORIES]} value={category} onChange={setCategory} />
      </Card>
      {lists.length > 1 && (
        <Card title="Popis">
          <Chips options={lists.map((l) => l.id)} labels={Object.fromEntries(lists.map((l) => [l.id, l.name]))} value={listId} onChange={setListId} />
        </Card>
      )}
      <Button title="Spremi" onPress={save} />
      <Button title="Obriši artikl" variant="danger" onPress={remove} />
    </Screen>
  );
}

function Chips({ options, labels, value, onChange }: {
  options: string[];
  labels?: Record<string, string>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: active ? colors.primary : colors.primarySoft }}
          >
            <Text style={{ color: active ? '#fff' : colors.primary, fontWeight: '600', fontSize: 13 }}>{labels?.[o] ?? o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
