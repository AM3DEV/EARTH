import { Stack } from 'expo-router';
import { COLORS } from '../../constants/colors';
export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }} />;
}
