import React from 'react';
import { TextInput, StyleSheet, TextInputProps, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../constants/colors';

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={COLORS.secondaryText}
        style={s.input}
        {...props}
      />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, color: COLORS.secondaryText, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, minHeight: 48, paddingHorizontal: 14, fontSize: 16, color: COLORS.text, backgroundColor: '#fff', textAlign: 'left' },
});
