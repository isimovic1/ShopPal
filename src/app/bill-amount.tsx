import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Card, Field, Screen, styles } from '../components/ui';
import { showAlert } from '../lib/alert';
import { setBillMonthAmount } from '../lib/api';
import { billMonthId, money, monthTitle, parseAmount } from '../lib/bills';
import { useHousehold } from '../lib/session';

const report = (e: unknown) => showAlert('Greška', e instanceof Error ? e.message : String(e));
const asText = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));

/** Sets a bill's amount for one month only (e.g. this month's electricity). */
export default function BillAmountScreen() {
  const { id, month } = useLocalSearchParams<{ id: string; month: string }>();
  const { code, bills, billMonths } = useHousehold();
  const bill = bills.find((b) => b.id === id);
  const monthDoc = billMonths.find((m) => m.id === billMonthId(id, month));
  const [amount, setAmount] = useState(asText(monthDoc?.amount));

  if (!bill || !month) {
    return (
      <Screen>
        <Text style={styles.muted}>Račun više ne postoji (možda ga je netko obrisao).</Text>
      </Screen>
    );
  }

  const monthName = monthTitle(month).toLowerCase().replace(/\.$/, '');
  const save = (asUsual: boolean) => {
    const a = amount.trim() ? parseAmount(amount) : undefined;
    if (a !== undefined && !(a >= 0)) return showAlert('Iznos', 'Upiši iznos, npr. 45,90.');
    setBillMonthAmount(code, bill, month, a, asUsual)
      .then(() => router.back())
      .catch(report);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: bill.name }} />
      <Card title={`Iznos za ${monthName}`}>
        <Field
          label="Iznos"
          suffix="€"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={bill.amount !== undefined ? asText(bill.amount) : '0,00'}
          autoFocus
        />
        <Text style={styles.muted}>
          {bill.amount !== undefined ? `Uobičajeni iznos je ${money(bill.amount)}. ` : ''}
          Ovaj iznos vrijedi samo za {monthName}; ostali mjeseci ostaju nepromijenjeni.
        </Text>
      </Card>
      <Button title={`Spremi za ${monthName}`} onPress={() => save(false)} />
      {bill.repeat === 'monthly' && (
        <Button title="Spremi i kao uobičajeni iznos" variant="secondary" onPress={() => save(true)} />
      )}
      {monthDoc?.amount !== undefined && (
        <Button
          title="Vrati na uobičajeni"
          variant="ghost"
          onPress={() =>
            setBillMonthAmount(code, bill, month, undefined)
              .then(() => router.back())
              .catch(report)
          }
        />
      )}
    </Screen>
  );
}
