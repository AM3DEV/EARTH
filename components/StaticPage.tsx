import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useTheme, Palette } from '../lib/theme';
import { BackButton } from './ui/BackButton';

export function StaticPage({ title, body }: { title: string; body: string }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  return (
    <View style={s.wrap}>
      <BackButton />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 110 }}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.body}>{body}</Text>
      </ScrollView>
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  title: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 12 },
  body: { color: C.text, fontSize: 15, lineHeight: 23 },
});
