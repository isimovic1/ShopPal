import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ItemRow } from '../../components/ItemRow';
import { Button, Row, Screen, styles } from '../../components/ui';
import { showAlert } from '../../lib/alert';
import { addItem, clearDone, setItemDone, setShopping } from '../../lib/api';
import { CATEGORIES } from '../../lib/household';
import { useHousehold } from '../../lib/session';
import { dueSuggestions } from '../../lib/suggestions';
import type { Item } from '../../lib/types';
import { colors, spacing } from '../../theme';

const report = (e: unknown) => showAlert('Greška', e instanceof Error ? e.message : String(e));

export default function ListScreen() {
  const { code, me, household, lists, items, history, activeListId, setActiveListId, error } = useHousehold();
  const navigation = useNavigation();
  const [text, setText] = useState('');

  const listItems = useMemo(() => items.filter((i) => i.listId === activeListId), [items, activeListId]);
  const open = listItems.filter((i) => !i.done).sort((a, b) => a.addedAt - b.addedAt);
  const done = listItems.filter((i) => i.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const groups = CATEGORIES.map((c) => ({ category: c, items: open.filter((i) => (i.category || 'Ostalo') === c) })).filter(
    (g) => g.items.length,
  );
  const due = dueSuggestions(history, listItems, Date.now()).slice(0, 6);

  const shopping = household?.shopping;
  const iAmShopping = shopping?.uid === me.uid;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setShopping(code, iAmShopping ? null : me).catch(report)}
          style={{
            marginRight: 12,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor: iAmShopping ? colors.success : colors.primarySoft,
          }}
        >
          <Text style={{ color: iAmShopping ? '#fff' : colors.primary, fontWeight: '700' }}>
            {iAmShopping ? 'Gotova kupovina' : 'Idem u trgovinu'}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, iAmShopping, code, me]);

  const add = (name: string) => {
    const n = name.trim();
    if (!n || !activeListId) return;
    addItem(code, activeListId, n, me).catch(report);
  };

  const toggle = (item: Item) => setItemDone(code, item, !item.done, me).catch(report);
  const edit = (item: Item) => router.push({ pathname: '/item', params: { id: item.id } });

  return (
    <Screen>
      {shopping && !iAmShopping && (
        <View style={{ backgroundColor: colors.success, borderRadius: 14, padding: spacing.md }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            🛒 {shopping.name} je u trgovini (od {new Date(shopping.since).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })})
          </Text>
          <Text style={{ color: '#ffffffdd', fontSize: 12 }}>Sve što sad dodaš odmah vidi na popisu.</Text>
        </View>
      )}
      {iAmShopping && (
        <View style={{ backgroundColor: colors.primarySoft, borderRadius: 14, padding: spacing.md }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            Ti si u trgovini. Dodirni artikl kad ga staviš u košaricu.
          </Text>
        </View>
      )}
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {lists.map((l) => {
          const active = l.id === activeListId;
          const count = items.filter((i) => i.listId === l.id && !i.done).length;
          return (
            <Pressable
              key={l.id}
              onPress={() => setActiveListId(l.id)}
              onLongPress={() => router.push({ pathname: '/list-edit', params: { id: l.id } })}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 18,
                backgroundColor: active ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
                {l.name}{count ? ` · ${count}` : ''}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => router.push('/list-edit')}
          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary }}
        >
          <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Nova lista</Text>
        </Pressable>
      </ScrollView>

      <Row>
        <View style={[styles.inputRow, { flex: 1 }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Dodaj artikl (npr. mlijeko)"
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="done"
            submitBehavior="submit"
            onSubmitEditing={() => {
              add(text);
              setText('');
            }}
          />
        </View>
        <Pressable
          onPress={() => {
            add(text);
            setText('');
          }}
          style={{ padding: 10, backgroundColor: colors.primary, borderRadius: 10 }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </Row>

      {due.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[styles.label]}>Možda vam treba</Text>
          <Row style={{ flexWrap: 'wrap', gap: 6 }}>
            {due.map((s) => (
              <Pressable
                key={s.entry.key}
                onPress={() => addItem(code, activeListId!, s.entry.name, me, s.entry.category).catch(report)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.primarySoft }}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>+ {s.entry.name}</Text>
              </Pressable>
            ))}
          </Row>
        </View>
      )}

      {open.length === 0 && done.length === 0 && (
        <Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.xl }]}>
          Popis je prazan. Dodaj prvi artikl gore.
        </Text>
      )}

      {groups.map((g) => (
        <View key={g.category} style={{ gap: 4 }}>
          <Text style={styles.label}>{g.category.toUpperCase()}</Text>
          {g.items.map((i) => (
            <ItemRow key={i.id} item={i} mine={i.addedBy === me.uid} onToggle={() => toggle(i)} onEdit={() => edit(i)} />
          ))}
        </View>
      ))}

      {done.length > 0 && (
        <View style={{ gap: 4, marginTop: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={styles.label}>U KOŠARICI ({done.length})</Text>
          </Row>
          {done.map((i) => (
            <ItemRow key={i.id} item={i} mine={i.addedBy === me.uid} onToggle={() => toggle(i)} onEdit={() => edit(i)} />
          ))}
          <Button title="Očisti kupljeno" variant="ghost" onPress={() => clearDone(code, done).catch(report)} />
        </View>
      )}
    </Screen>
  );
}
