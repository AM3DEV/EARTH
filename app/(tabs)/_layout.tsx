import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, Landmark, Sparkles, User } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.secondaryText, tabBarStyle: { minHeight: 60 } }}>
      <Tabs.Screen name="map" options={{ title: t('tabs.map'), tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} /> }} />
      <Tabs.Screen name="monument" options={{ title: t('tabs.monument'), tabBarIcon: ({ color, size }) => <Landmark color={color} size={size} /> }} />
      <Tabs.Screen name="erth" options={{ title: t('tabs.erth'), tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
