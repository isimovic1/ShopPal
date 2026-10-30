import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, ProgressBar, Row, Screen, styles } from '../../components/ui';
import { showAlert } from '../../lib/alert';
import { setBillPaid } from '../../lib/api';
import { BillRow, billsForMonth, dayMonth, monthKey, monthSummary, monthTitle, money, shiftMonth } from '../../lib/bills';
import { toDateKey, todayKey } from '../../lib/dates';
import { useHousehold } from '../../lib/session';
import { colors, spacing } from '../../theme';

const report = (e: unknown) => showAlert('Greška', e instanceof Error ? e.message : String(e));

export default function BillsScreen() {
  const { code, me, bills, billMonths } = useHousehold();
  const today = todayKey();
  const [month, setMonth] = useState(monthKey(today));
  const rows = billsForMonth(bills, billMonths, month, today);
  const sum = monthSummary(rows);

  const toggle = (r: BillRow) => {
    if (!r.paid) return setBillPaid(code, r.bill, month, true, me).catch(report);
    showAlert('Označiti kao neplaćeno?', `${r.bill.name} je platio/la ${r.monthDoc?.paidByName ?? '?'}.`, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Neplaćeno', style: 'destructive', onPress: () => setBillPaid(code, r.bill, month, false, me).catch(report) },
    ]);
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={12} accessibilityLabel="Prethodni mjesec">
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => setMonth(monthKey(today))}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{monthTitle(month)}</Text>
        </Pressable>
        <Pressable onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={12} accessibilityLabel="Sljedeći mjesec">
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </Pressable>
      </Row>

      {rows.length > 0 && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={styles.muted}>
              Plaćeno {sum.paidCount}/{sum.count}
            </Text>
            {sum.total > 0 && <Text style={[styles.text, { fontWeight: '700' }]}>{money(sum.total)}</Text>}
          </Row>
          <ProgressBar value={sum.paidCount} max={sum.count} color={colors.success} />
          {sum.total > 0 && (
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.success }}>Plaćeno {money(sum.paid)}</Text>
              <Text style={{ color: sum.remaining > 0 ? colors.danger : colors.muted }}>Ostalo {money(sum.remaining)}</Text>
            </Row>
          )}
          {sum.byPerson.length > 0 && (
            <Text style={[styles.muted, { fontSize: 12 }]}>
              {sum.byPerson.map((p) => `${p.name}: ${p.count}×${p.amount ? ` (${money(p.amount)})` : ''}`).join(' · ')}
            </Text>
          )}
        </Card>
      )}

      {rows.length === 0 && (
        <Card>
          <Text style={styles.text}>Nema računa za ovaj mjesec.</Text>
          <Text style={styles.muted}>
            Dodaj režije, najam, internet, pretplate… Mjesečni računi se sami pojavljuju svaki mjesec, a ovdje označite tko je
            platio.
          </Text>
        </Card>
      )}

      {rows.map((r) => (
        <BillCard
          key={r.bill.id}
          row={r}
          onToggle={() => toggle(r)}
          onEdit={() => router.push({ pathname: '/bill', params: { id: r.bill.id } })}
          onAmount={() => router.push({ pathname: '/bill-amount', params: { id: r.bill.id, month } })}
        />
      ))}

      <Button title="+ Novi račun" onPress={() => router.push({ pathname: '/bill', params: { month } })} />
    </Screen>
  );
}

function BillCard({
  row,
  onToggle,
  onEdit,
  onAmount,
}: {
  row: BillRow;
  onToggle: () => void;
  onEdit: () => void;
  onAmount: () => void;
}) {
  const { bill, monthDoc, amount, amountOverridden, paid, dueDate, state } = row;
  const color = state === 'paid' ? colors.success : state === 'late' ? colors.danger : colors.warning;
  const status =
    state === 'paid'
      ? `Plaćeno · ${monthDoc?.paidByName ?? '?'}${monthDoc?.paidAt ? ` · ${dayMonth(toDateKey(new Date(monthDoc.paidAt)))}` : ''}`
      : state === 'late'
        ? `Neplaćeno · kasni (${dayMonth(dueDate!)})`
        : `Neplaćeno${dueDate ? ` · dospijeva ${dayMonth(dueDate)}` : ''}`;
  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: 14,
        backgroundColor: pressed ? colors.bg : colors.card,
        borderLeftWidth: 4,
        borderLeftColor: color,
      })}
    >
      <Pressable onPress={onToggle} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: paid }}>
        <Ionicons name={paid ? 'checkmark-circle' : 'ellipse-outline'} size={30} color={paid ? colors.success : color} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={[styles.text, { fontWeight: '700', flex: 1 }]} numberOfLines={1}>
            {bill.name}
          </Text>
          <Pressable onPress={onAmount} hitSlop={10} accessibilityLabel={`Iznos za ${bill.name}`}>
            <Text style={amount === undefined ? { color: colors.primary, fontWeight: '600' } : [styles.text, { fontWeight: '700' }]}>
              {amount === undefined ? '+ iznos' : money(amount)}
            </Text>
          </Pressable>
        </Row>
        <Text style={{ fontSize: 12, color, fontWeight: '600' }}>{status}</Text>
        {amountOverridden && bill.amount !== undefined && bill.amount !== amount && (
          <Text style={[styles.muted, { fontSize: 11 }]}>iznos za ovaj mjesec · uobičajeno {money(bill.amount)}</Text>
        )}
        {bill.repeat === 'once' && <Text style={[styles.muted, { fontSize: 11 }]}>jednokratno</Text>}
      </View>
    </Pressable>
  );
}
