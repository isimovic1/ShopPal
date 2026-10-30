import { Pressable, Text } from 'react-native';

import { colors } from '../theme';

/** Small selectable pill used for filters and pickers. */
export function Chip({ label, active, onPress, small }: { label: string; active: boolean; onPress: () => void; small?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: small ? 10 : 12,
        paddingVertical: small ? 5 : 7,
        borderRadius: 16,
        backgroundColor: active ? colors.primary : colors.primarySoft,
      }}
    >
      <Text style={{ color: active ? '#fff' : colors.primary, fontWeight: '600', fontSize: small ? 12 : 13 }}>{label}</Text>
    </Pressable>
  );
}
