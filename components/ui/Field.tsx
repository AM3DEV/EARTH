import React, { useState } from 'react';
import { TextInput, StyleSheet, TextInputProps, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../constants/colors';

export function Field({ label, style, onFocus, onBlur, ...props }: { label: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={COLORS.muted}
        style={[s.input, style, focused && s.inputFocused] as any}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...props}
      />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, color: COLORS.secondaryText, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, minHeight: 48,
    paddingHorizontal: 14, fontSize: 16, color: COLORS.text, backgroundColor: '#fff', textAlign: 'left',
  },
  inputFocused: { borderColor: COLORS.primary, borderWidth: 1.5 },
});
