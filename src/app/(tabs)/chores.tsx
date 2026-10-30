import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Chip } from '../../components/Chip';
import { Button, Row, Screen, styles } from '../../components/ui';
import { showAlert } from '../../lib/alert';
import { addTask, clearDoneTasks, completeTask, reopenTask } from '../../lib/api';
import { shortDate, toDateKey, todayKey } from '../../lib/dates';
import { useHousehold } from '../../lib/session';
import { dueLabel, groupTasks, SECTION_LABELS } from '../../lib/tasks';
import type { Task } from '../../lib/types';
import { colors, spacing } from '../../theme';

const report = (e: unknown) => showAlert('Greška', e instanceof Error ? e.message : String(e));

type Filter = 'all' | 'mine' | string;

export default function ChoresScreen() {
  const { code, me, household, tasks } = useHousehold();
  const today = todayKey();
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showDone, setShowDone] = useState(false);
  const members = household?.members ?? {};
  const others = Object.entries(members).filter(([uid]) => uid !== me.uid);

  // "Moji" also shows chores anyone can do; a partner filter shows only theirs.
  const visible = tasks.filter((t) =>
    filter === 'all' ? true : filter === 'mine' ? t.assignedTo === me.uid || t.assignedTo === null : t.assignedTo === filter,
  );
  const { sections, done } = groupTasks(visible, today);

  const add = () => {
    const title = text.trim();
    if (!title) return;
    setText('');
    addTask(code, { title, assignedTo: null, repeat: 'none' }, me).catch(report);
  };

  const toggle = (t: Task) => (t.done ? reopenTask(code, t.id) : completeTask(code, t, me, today)).catch(report);

  return (
    <Screen>
      <Row>
        <View style={[styles.inputRow, { flex: 1 }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Dodaj posao (npr. usisati stan)"
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="done"
            submitBehavior="submit"
            onSubmitEditing={add}
          />
        </View>
        <Pressable onPress={add} accessibilityLabel="Dodaj posao" style={{ padding: 10, backgroundColor: colors.primary, borderRadius: 10 }}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </Row>

      <Row style={{ justifyContent: 'space-between' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flex: 1 }}>
          <Chip label="Svi" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Moji" active={filter === 'mine'} onPress={() => setFilter('mine')} />
          {others.map(([uid, name]) => (
            <Chip key={uid} label={name} active={filter === uid} onPress={() => setFilter(uid)} />
          ))}
        </ScrollView>
        <Pressable onPress={() => router.push('/task')} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Detaljno</Text>
        </Pressable>
      </Row>

      {sections.length === 0 && done.length === 0 && (
        <Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.xl }]}>
          Nema poslova. Dodaj npr. "Usisati", "Oprati kupaonicu" ili "Iznijeti smeće". Dodir na posao otvara detalje: tko, kada
          i ponavljanje.
        </Text>
      )}

      {sections.length === 0 && done.length > 0 && (
        <Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.lg }]}>Sve je napravljeno 🎉</Text>
      )}

      {sections.map((g) => (
        <View key={g.section} style={{ gap: 4 }}>
          <Text style={[styles.label, g.section === 'late' && { color: colors.danger }]}>{SECTION_LABELS[g.section].toUpperCase()}</Text>
          {g.tasks.map((t) => (
            <TaskRow key={t.id} task={t} today={today} members={members} meUid={me.uid} onToggle={() => toggle(t)} />
          ))}
        </View>
      ))}

      {done.length > 0 && (
        <View style={{ gap: 4, marginTop: spacing.sm }}>
          <Pressable onPress={() => setShowDone(!showDone)}>
            <Row style={{ gap: 4 }}>
              <Ionicons name={showDone ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.muted} />
              <Text style={styles.label}>GOTOVO ({done.length})</Text>
            </Row>
          </Pressable>
          {showDone && (
            <>
              {done.map((t) => (
                <TaskRow key={t.id} task={t} today={today} members={members} meUid={me.uid} onToggle={() => toggle(t)} />
              ))}
              <Button title="Očisti gotovo" variant="ghost" onPress={() => clearDoneTasks(code, done).catch(report)} />
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

function TaskRow({ task, today, members, meUid, onToggle }: {
  task: Task;
  today: string;
  members: Record<string, string>;
  meUid: string;
  onToggle: () => void;
}) {
  const label = task.done ? '' : dueLabel(task.dueDate, today);
  const late = !task.done && !!task.dueDate && task.dueDate < today;
  const assignee = task.assignedTo ? (task.assignedTo === meUid ? 'Ja' : members[task.assignedTo] ?? '?') : 'Bilo tko';
  const sub = task.done
    ? `${task.doneByName ?? ''} · ${shortDate(toDateKey(new Date(task.doneAt ?? 0)))}`
    : task.lastDoneByName
      ? `zadnje: ${task.lastDoneByName}, ${shortDate(toDateKey(new Date(task.lastDoneAt ?? 0)))}`
      : task.note ?? '';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/task', params: { id: task.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 10,
        paddingHorizontal: spacing.md,
        backgroundColor: pressed ? colors.bg : colors.card,
        borderRadius: 12,
      })}
    >
      <Pressable onPress={onToggle} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: task.done }}>
        <Ionicons
          name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={task.done ? colors.success : late ? colors.danger : colors.border}
        />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 16, color: task.done ? colors.muted : colors.text, textDecorationLine: task.done ? 'line-through' : 'none' }}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {sub ? <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        {!task.done && (
          <Text style={{ fontSize: 11, fontWeight: '700', color: task.assignedTo ? colors.primary : colors.muted }}>{assignee}</Text>
        )}
        <Row style={{ gap: 3 }}>
          {task.repeat !== 'none' && <Ionicons name="repeat" size={13} color={colors.muted} />}
          {label ? <Text style={{ fontSize: 12, color: late ? colors.danger : colors.muted, fontWeight: late ? '700' : '400' }}>{label}</Text> : null}
        </Row>
      </View>
    </Pressable>
  );
}
