import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/tabs';
import { ColorValue } from 'react-native';

import { colors } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => (
  <Ionicons name={name} color={color as string} size={size} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Popis', tabBarIcon: icon('cart-outline') }} />
      <Tabs.Screen name="bills" options={{ title: 'Računi', tabBarIcon: icon('receipt-outline') }} />
      <Tabs.Screen name="chores" options={{ title: 'Poslovi', tabBarIcon: icon('checkmark-done-outline') }} />
      <Tabs.Screen name="meals" options={{ title: 'Jela', tabBarIcon: icon('restaurant-outline') }} />
      <Tabs.Screen name="household" options={{ title: 'Kućanstvo', tabBarIcon: icon('people-outline') }} />
    </Tabs>
  );
}
