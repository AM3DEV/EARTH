import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export function StaticPage({ title, body }: { title: string; body: string }) {
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 20, paddingTop: 70 }}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.body}>{body}</Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  body: { color: COLORS.text, fontSize: 15, lineHeight: 23 },
});
