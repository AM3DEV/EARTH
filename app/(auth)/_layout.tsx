import { Stack } from 'expo-router';
import { useTheme } from '../../lib/theme';
export default function AuthLayout() {
  const { colors: C } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }} />;
}
