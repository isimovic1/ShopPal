import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { openRecipe, SourceBadge } from '../../components/MealBits';
import { Button, Card, Row, Screen, styles } from '../../components/ui';
import { showAlert } from '../../lib/alert';
import { markCooked } from '../../lib/api';
import { linkSource, matchesMeal, pickMeal } from '../../lib/meals';
import { useHousehold } from '../../lib/session';
import type { Meal } from '../../lib/types';
import { colors, spacing } from '../../theme';

const report = (e: unknown) => showAlert('Greška', e instanceof Error ? e.message : String(e));

export default function MealsScreen() {
  const { code, meals } = useHousehold();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Meal | null>(null);
  const list = meals
    .filter((m) => matchesMeal(m, query))
    .sort((a, b) => a.title.localeCompare(b.title, 'hr'));

  const roll = () => {
    const m = pickMeal(meals, Date.now(), Math.random, picked?.id);
    if (!m) return showAlert('Nema jela', 'Prvo dodaj nekoliko jela.');
    setPicked(m);
  };

  return (
    <Screen>
      <Row>
        <View style={[styles.inputRow, { flex: 1 }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Traži jelo ili sastojak…"
            placeholderTextColor={colors.muted}
            style={[styles.input, { marginLeft: 6 }]}
          />
        </View>
        <Pressable onPress={() => router.push('/meal')} accessibilityLabel="Novo jelo" style={{ padding: 10, backgroundColor: colors.primary, borderRadius: 10 }}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </Row>

      {meals.length > 0 && <Button title="🎲 Što danas kuhamo?" variant="secondary" onPress={roll} />}

      {picked && (
        <Card style={{ borderWidth: 1.5, borderColor: colors.primary }}>
          <Text style={styles.label}>PRIJEDLOG ZA DANAS</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{picked.title}</Text>
          <Row style={{ flexWrap: 'wrap', gap: spacing.sm }}>
            <Button title="Otvori" variant="secondary" style={{ paddingVertical: 8 }} onPress={() => router.push({ pathname: '/meal', params: { id: picked.id } })} />
            <Button title="Drugo" variant="ghost" style={{ paddingVertical: 8 }} onPress={roll} />
          </Row>
        </Card>
      )}

      {meals.length === 0 && (
        <Card>
          <Text style={styles.text}>Još nema jela.</Text>
          <Text style={styles.muted}>
            Spremi jela koja želite probati ili često kuhate, s linkom na recept (Instagram, TikTok, YouTube…) i sastojcima
            koje jednim dodirom prebaciš na popis za kupovinu.
          </Text>
        </Card>
      )}

      {list.map((m) => (
        <MealRow key={m.id} meal={m} onCooked={() => markCooked(code, m).catch(report)} />
      ))}
    </Screen>
  );
}

function MealRow({ meal, onCooked }: { meal: Meal; onCooked: () => void }) {
  const source = linkSource(meal.link);
  const cooked = meal.lastCooked
    ? `skuhano ${meal.cookedCount}× · zadnje ${new Date(meal.lastCooked).toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric' })}`
    : 'još nije kuhano';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/meal', params: { id: meal.id } })}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.bg : colors.card, borderRadius: 14, padding: spacing.md, gap: 6 })}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[styles.text, { fontWeight: '700', flex: 1, fontSize: 16 }]} numberOfLines={2}>
          {meal.title}
        </Text>
        {source && <SourceBadge source={source} />}
      </Row>
      <Text style={[styles.muted, { fontSize: 12 }]}>
        {cooked} · dodao/la {meal.addedByName}
      </Text>
      <Row style={{ gap: spacing.sm }}>
        {meal.link ? (
          <Button title="Otvori recept" variant="secondary" style={{ flex: 1, paddingVertical: 8 }} onPress={() => openRecipe(meal.link)} />
        ) : null}
        <Button title="Skuhali smo" variant="ghost" style={{ flex: 1, paddingVertical: 8 }} onPress={onCooked} />
      </Row>
    </Pressable>
  );
}
