import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Chip } from '../components/Chip';
import { Button, Card, Field, Row, Screen, styles } from '../components/ui';
import { showAlert } from '../lib/alert';
import { addBill, BillInput, deleteBill, updateBill } from '../lib/api';
import { monthKey, monthTitle, parseAmount } from '../lib/bills';
import { todayKey } from '../lib/dates';
import { useHousehold } from '../lib/session';
import type { Bill } from '../lib/types';

const report = (e: unknown) => showAlert('Greška', e instanceof Error ? e.message : String(e));

export default function BillScreen() {
  const params = useLocalSearchParams<{ id?: string; month?: string }>();
  const { code, me, bills } = useHousehold();
  const existing = params.id ? bills.find((b) => b.id === params.id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing?.amount !== undefined ? String(existing.amount).replace('.', ',') : '');
  const [dueDay, setDueDay] = useState(existing?.dueDay ? String(existing.dueDay) : '');
  const [repeat, setRepeat] = useState<Bill['repeat']>(existing?.repeat ?? 'monthly');
  const [note, setNote] = useState(existing?.note ?? '');
  const month = existing?.month ?? params.month ?? monthKey(todayKey());

  if (params.id && !existing) {
    return (
      <Screen>
        <Text style={styles.muted}>Račun više ne postoji (možda ga je netko obrisao).</Text>
      </Screen>
    );
  }

  const save = () => {
    if (!name.trim()) return showAlert('Naziv', 'Upiši naziv računa, npr. "Struja" ili "Najam".');
    const a = amount.trim() ? parseAmount(amount) : undefined;
    if (a !== undefined && !(a >= 0)) return showAlert('Iznos', 'Upiši iznos, npr. 45,90 — ili ostavi prazno.');
    const d = dueDay.trim() ? parseInt(dueDay, 10) : undefined;
    if (d !== undefined && !(d >= 1 && d <= 31)) return showAlert('Dan', 'Dan dospijeća je broj od 1 do 31.');
    const input: BillInput = {
      name: name.trim(),
      amount: a,
      dueDay: d,
      repeat,
      month: repeat === 'once' ? month : undefined,
      note: note.trim() || undefined,
    };
    (existing ? updateBill(code, existing.id, input) : addBill(code, input, me)).then(() => router.back()).catch(report);
  };

  const remove = () =>
    showAlert('Obrisati račun?', `${existing!.name} i sve oznake plaćanja za njega.`, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Obriši', style: 'destructive', onPress: () => deleteBill(code, existing!.id).then(() => router.back()).catch(report) },
    ]);

  return (
    <Screen>
      <Card>
        <Field label="Naziv" value={name} onChangeText={setName} placeholder="npr. Struja, Najam, Internet" />
        <Row>
          <Field label={repeat === 'monthly' ? 'Uobičajeni iznos' : 'Iznos'} suffix="€" placeholder="nije obavezno" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Field label="Dospijeva dana" value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="npr. 15" />
        </Row>
        <Field label="Napomena (nije obavezno)" value={note} onChangeText={setNote} placeholder="npr. plaća se preko m-bankinga" />
      </Card>
      <Card title="Ponavljanje">
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Svaki mjesec" active={repeat === 'monthly'} onPress={() => setRepeat('monthly')} />
          <Chip label={`Samo ${monthTitle(month).toLowerCase()}`} active={repeat === 'once'} onPress={() => setRepeat('once')} />
        </Row>
        {repeat === 'monthly' && (
          <Text style={styles.muted}>
            Račun se pojavljuje svaki mjesec s uobičajenim iznosom. Ako je neki mjesec drukčiji (npr. struja), dodirni iznos na
            popisu računa i upiši iznos samo za taj mjesec.
          </Text>
        )}
      </Card>
      <Button title="Spremi" onPress={save} />
      {existing && <Button title="Obriši račun" variant="danger" onPress={remove} />}
    </Screen>
  );
}
