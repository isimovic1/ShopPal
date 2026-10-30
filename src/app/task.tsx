import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Chip } from '../components/Chip';
import { Button, Card, Field, Row, Screen, styles } from '../components/ui';
import { showAlert } from '../lib/alert';
import { addTask, deleteTask, TaskInput, updateTask } from '../lib/api';
import { addDays, friendlyDate, todayKey } from '../lib/dates';
import { useHousehold } from '../lib/session';
import { REPEAT_LABELS } from '../lib/tasks';
import type { TaskRepeat } from '../lib/types';

const report = (e: unknown) => showAlert('Greška', e instanceof Error ? e.message : String(e));

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { code, me, household, tasks } = useHousehold();
  const existing = id ? tasks.find((t) => t.id === id) : undefined;
  const today = todayKey();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [assignedTo, setAssignedTo] = useState<string | null>(existing?.assignedTo ?? null);
  const [repeat, setRepeat] = useState<TaskRepeat>(existing?.repeat ?? 'none');
  const [dueDate, setDueDate] = useState<string | undefined>(existing?.dueDate);
  const members = Object.entries(household?.members ?? {});

  if (id && !existing) {
    return (
      <Screen>
        <Text style={styles.muted}>Posao više ne postoji (možda ga je netko obrisao).</Text>
      </Screen>
    );
  }

  const save = () => {
    if (!title.trim()) return showAlert('Naziv', 'Upiši što treba napraviti.');
    const input: TaskInput = { title: title.trim(), note: note.trim() || undefined, assignedTo, repeat, dueDate };
    (existing ? updateTask(code, existing.id, input) : addTask(code, input, me)).then(() => router.back()).catch(report);
  };

  const remove = () =>
    showAlert('Obrisati posao?', existing!.title, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Obriši', style: 'destructive', onPress: () => deleteTask(code, existing!.id).then(() => router.back()).catch(report) },
    ]);

  return (
    <Screen>
      <Card>
        <Field label="Što treba napraviti" value={title} onChangeText={setTitle} placeholder="npr. Oprati kupaonicu" />
        <Field label="Napomena (nije obavezno)" value={note} onChangeText={setNote} />
      </Card>
      <Card title="Tko">
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Bilo tko" active={assignedTo === null} onPress={() => setAssignedTo(null)} />
          {members.map(([uid, name]) => (
            <Chip key={uid} label={uid === me.uid ? `${name} (ja)` : name} active={assignedTo === uid} onPress={() => setAssignedTo(uid)} />
          ))}
        </Row>
      </Card>
      <Card title="Kada">
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Bez roka" active={!dueDate} onPress={() => setDueDate(undefined)} />
          <Chip label="Danas" active={dueDate === today} onPress={() => setDueDate(today)} />
          <Chip label="Sutra" active={dueDate === addDays(today, 1)} onPress={() => setDueDate(addDays(today, 1))} />
          <Chip label="Za tjedan" active={dueDate === addDays(today, 7)} onPress={() => setDueDate(addDays(today, 7))} />
        </Row>
        {dueDate && (
          <Row style={{ justifyContent: 'space-between' }}>
            <Button title="−1 dan" variant="secondary" style={{ paddingVertical: 6 }} onPress={() => setDueDate(addDays(dueDate, -1))} />
            <Text style={[styles.text, { fontWeight: '700' }]}>{friendlyDate(dueDate)}</Text>
            <Button title="+1 dan" variant="secondary" style={{ paddingVertical: 6 }} onPress={() => setDueDate(addDays(dueDate, 1))} />
          </Row>
        )}
      </Card>
      <Card title="Ponavljanje">
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          {(Object.keys(REPEAT_LABELS) as TaskRepeat[]).map((r) => (
            <Chip key={r} label={REPEAT_LABELS[r]} active={repeat === r} onPress={() => setRepeat(r)} />
          ))}
        </Row>
        {repeat !== 'none' && (
          <Text style={[styles.muted, { fontSize: 12 }]}>
            Kad se odradi, posao ostaje na popisu i seli se na sljedeći termin; vidi se tko ga je zadnji napravio.
          </Text>
        )}
      </Card>
      {existing?.lastDoneByName && (
        <Text style={styles.muted}>
          Zadnje napravio/la {existing.lastDoneByName}, {new Date(existing.lastDoneAt ?? 0).toLocaleDateString('hr-HR')}
        </Text>
      )}
      <Button title="Spremi" onPress={save} />
      {existing && <Button title="Obriši posao" variant="danger" onPress={remove} />}
    </Screen>
  );
}
