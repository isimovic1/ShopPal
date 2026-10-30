import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { openRecipe, SourceBadge } from '../components/MealBits';
import { Button, Card, Field, Row, Screen, styles } from '../components/ui';
import { showAlert } from '../lib/alert';
import { addIngredientsToList, addMeal, deleteMeal, MealInput, markCooked, updateMeal } from '../lib/api';
import { extractUrl, ingredientLines, linkSource } from '../lib/meals';
import { useHousehold } from '../lib/session';

const report = (e: unknown) => showAlert('Greška', e instanceof Error ? e.message : String(e));

export default function MealScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { code, me, meals, lists, activeListId } = useHousehold();
  const existing = id ? meals.find((m) => m.id === id) : undefined;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [link, setLink] = useState(existing?.link ?? '');
  const [ingredients, setIngredients] = useState(existing?.ingredients ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const source = linkSource(link);
  const list = lists.find((l) => l.id === activeListId);
  const lines = ingredientLines(ingredients);

  if (id && !existing) {
    return (
      <Screen>
        <Text style={styles.muted}>Jelo više ne postoji (možda ga je netko obrisao).</Text>
      </Screen>
    );
  }

  const input = (): MealInput | null => {
    if (!title.trim()) {
      showAlert('Naziv', 'Upiši naziv jela.');
      return null;
    }
    // Shared posts are pasted with their caption ("Probaj ovo! https://…"); keep only the link.
    const url = link.trim() ? extractUrl(link) : undefined;
    if (link.trim() && !url) {
      showAlert('Link', 'Ovo ne izgleda kao link. Zalijepi adresu objave, npr. https://www.instagram.com/reel/…');
      return null;
    }
    return { title: title.trim(), link: url ?? undefined, ingredients: ingredients.trim() || undefined, note: note.trim() || undefined };
  };

  const save = () => {
    const i = input();
    if (!i) return;
    (existing ? updateMeal(code, existing.id, i) : addMeal(code, i, me)).then(() => router.back()).catch(report);
  };

  const toList = () => {
    if (!activeListId || !lines.length) return;
    addIngredientsToList(code, activeListId, lines, me)
      .then((n) => showAlert('Dodano na popis', `${n} ${sastojak(n)} na popis "${list?.name ?? ''}".`))
      .catch(report);
  };

  const remove = () =>
    showAlert('Obrisati jelo?', existing!.title, [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Obriši', style: 'destructive', onPress: () => deleteMeal(code, existing!.id).then(() => router.back()).catch(report) },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? existing.title : 'Novo jelo' }} />
      <Card>
        <Field label="Naziv jela" value={title} onChangeText={setTitle} placeholder="npr. Piletina u umaku od gljiva" />
        <Field
          label="Link na recept (Instagram, TikTok, YouTube…)"
          value={link}
          onChangeText={setLink}
          placeholder="Zalijepi link"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {source && (
          <Row style={{ justifyContent: 'space-between' }}>
            <SourceBadge source={source} />
            <Button title="Otvori recept" variant="ghost" style={{ paddingVertical: 4 }} onPress={() => openRecipe(extractUrl(link) ?? link)} />
          </Row>
        )}
      </Card>
      <Card title="Sastojci">
        <Field
          label="Jedan sastojak po retku"
          value={ingredients}
          onChangeText={setIngredients}
          multiline
          placeholder={'piletina\ngljive\nvrhnje za kuhanje'}
          style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]}
        />
        {existing && lines.length > 0 && (
          <Button title={`Dodaj sastojke na popis (${lines.length})`} variant="secondary" onPress={toList} />
        )}
      </Card>
      <Card>
        <Field label="Napomena (nije obavezno)" value={note} onChangeText={setNote} placeholder="npr. ide uz rižu, za 4 osobe" />
        {existing && (
          <Text style={[styles.muted, { fontSize: 12 }]}>
            Dodao/la {existing.addedByName}
            {existing.cookedCount ? ` · skuhano ${existing.cookedCount}×` : ''}
          </Text>
        )}
      </Card>
      <Button title="Spremi" onPress={save} />
      {existing && (
        <View style={{ gap: 8 }}>
          <Button title="Skuhali smo danas" variant="secondary" onPress={() => markCooked(code, existing).then(() => showAlert('Zapisano', 'Dobar tek! 🍽️')).catch(report)} />
          <Button title="Obriši jelo" variant="danger" onPress={remove} />
        </View>
      )}
    </Screen>
  );
}

/** Croatian plural: 1 sastojak, 2–4 sastojka, 5+ sastojaka (21 sastojak…). */
function sastojak(n: number) {
  const d = n % 10;
  const t = n % 100;
  if (d === 1 && t !== 11) return 'sastojak';
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return 'sastojka';
  return 'sastojaka';
}
