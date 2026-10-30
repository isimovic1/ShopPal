import { Linking, Text, View } from 'react-native';

import { showAlert } from '../lib/alert';
import { normalizeUrl } from '../lib/meals';
import { colors } from '../theme';

export function openRecipe(link: string | undefined) {
  const url = link ? normalizeUrl(link) : null;
  if (!url) return showAlert('Link', 'Ovaj link ne izgleda ispravno.');
  Linking.openURL(url).catch((e) => showAlert('Greška', e instanceof Error ? e.message : String(e)));
}

const SOURCE_COLORS: Record<string, string> = {
  Instagram: '#C13584',
  TikTok: '#111111',
  YouTube: '#E52D27',
  Facebook: '#1877F2',
  Pinterest: '#E60023',
};

export function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] ?? colors.muted;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: color + '1A' }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
        {source}
      </Text>
    </View>
  );
}
