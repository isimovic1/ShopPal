import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import type { Item } from '../lib/types';
import { colors, spacing } from '../theme';

export function ItemRow({ item, mine, onToggle, onEdit }: {
  item: Item;
  /** Added by this phone's user; only the partner's name is shown. */
  mine: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onEdit}
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
      <Ionicons
        name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
        size={26}
        color={item.done ? colors.success : colors.border}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            color: item.done ? colors.muted : colors.text,
            textDecorationLine: item.done ? 'line-through' : 'none',
          }}
        >
          {item.name}
        </Text>
        {item.note ? <Text style={{ fontSize: 12, color: colors.muted }}>{item.note}</Text> : null}
      </View>
      {item.done && item.doneByName ? (
        <Text style={{ fontSize: 11, color: colors.success }}>{item.doneByName}</Text>
      ) : !mine ? (
        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{item.addedByName}</Text>
      ) : null}
      <Pressable onPress={onEdit} hitSlop={10}>
        <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
      </Pressable>
    </Pressable>
  );
}
