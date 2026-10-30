import { Pressable, Text, View } from 'react-native';

import { Card, Row, Screen, styles } from '../../components/ui';
import { showAlert } from '../../lib/alert';
import { addItem } from '../../lib/api';
import { useHousehold } from '../../lib/session';
import { dueSuggestions, frequentItems, intervalLabel } from '../../lib/suggestions';
import type { HistoryEntry } from '../../lib/types';
import { colors, spacing } from '../../theme';

export default function Suggestions() {
  const { code, me, history, items, lists, activeListId } = useHousehold();
  const list = lists.find((l) => l.id === activeListId);
  const listItems = items.filter((i) => i.listId === activeListId);
  const now = Date.now();
  const due = dueSuggestions(history, listItems, now);
  const frequent = frequentItems(history, listItems);

  const add = (h: HistoryEntry) => {
    if (!activeListId) return;
    addItem(code, activeListId, h.name, me, h.category).catch((e) => showAlert('Greška', String(e)));
  };

  return (
    <Screen>
      <Text style={styles.muted}>Dodaje se na popis: {list?.name ?? '–'}</Text>

      <Card title="Vrijeme je za">
        {due.length === 0 ? (
          <Text style={styles.muted}>
            Prijedlozi se pojave kad nešto kupite barem dvaput: aplikacija nauči koliko često vam treba i podsjeti vas kad je
            vrijeme.
          </Text>
        ) : (
          due.map((s) => (
            <Row key={s.entry.key} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.text, { fontWeight: '600' }]}>{s.entry.name}</Text>
                <Text style={[styles.muted, { fontSize: 12 }]}>
                  Kupujete {intervalLabel(s.intervalDays)} · zadnje prije {Math.round(s.daysSince)} d
                </Text>
              </View>
              <AddButton onPress={() => add(s.entry)} />
            </Row>
          ))
        )}
      </Card>

      <Card title="Često kupujete">
        {frequent.length === 0 ? (
          <Text style={styles.muted}>Još nema kupljenih artikala.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {frequent.map((h) => (
              <Pressable
                key={h.key}
                onPress={() => add(h)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.primarySoft }}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  + {h.name} <Text style={{ color: colors.muted, fontWeight: '400' }}>{h.count}×</Text>
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.primary }}>
      <Text style={{ color: '#fff', fontWeight: '700' }}>+ Dodaj</Text>
    </Pressable>
  );
}
