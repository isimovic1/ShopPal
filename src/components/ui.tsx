import { ReactNode, useContext } from 'react';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../theme';

/**
 * Shrinks its content above the on-screen keyboard. Android draws edge-to-edge,
 * so the window is no longer resized for the keyboard and fields near the bottom
 * would stay hidden behind it.
 */
export function KeyboardAware({ children }: { children: ReactNode }) {
  // Screens without a header (welcome, scanner) have no height to offset.
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={headerHeight}>
      {children}
    </KeyboardAvoidingView>
  );
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <KeyboardAware>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }]}>{children}</View>
        )}
      </KeyboardAware>
    </SafeAreaView>
  );
}

export function Card({ children, style, title, right }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  title?: string;
  right?: ReactNode;
}) {
  return (
    <View style={[styles.card, style]}>
      {(title || right) && (
        <View style={styles.cardHeader}>
          {title ? <Text style={styles.cardTitle}>{title}</Text> : <View />}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled, style }: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: colors.primary, secondary: colors.primarySoft, danger: colors.danger, ghost: 'transparent' }[variant];
  const fg = variant === 'secondary' || variant === 'ghost' ? colors.primary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }, style]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, suffix, ...props }: TextInputProps & { label: string; suffix?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stat({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function ProgressBar({ value, max, color = colors.primary }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const over = max > 0 && value > max;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: over ? colors.danger : color }]} />
    </View>
  );
}

export function parseNum(text: string): number {
  return parseFloat(text.replace(',', '.'));
}

export const fmt = (n: number, digits = 0) =>
  Number.isFinite(n) ? n.toFixed(digits).replace('.', ',') : '–';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  button: { paddingVertical: 13, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  field: { gap: spacing.xs, flex: 1 },
  label: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 16, color: colors.text },
  suffix: { color: colors.muted, marginLeft: spacing.xs },
  segmented: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.sm, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: radius.sm - 2, alignItems: 'center' },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: colors.text },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statUnit: { fontSize: 13, fontWeight: '500', color: colors.muted },
  statLabel: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  muted: { color: colors.muted },
  text: { color: colors.text, fontSize: 15 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
});
