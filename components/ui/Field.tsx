import React, { useState } from 'react';
import { TextInput, StyleSheet, TextInputProps, Text, View } from 'react-native';
import { RADIUS } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';

export function Field({ label, style, onFocus, onBlur, ...props }: { label: string } & TextInputProps) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.muted}
        style={[s.input, style, focused && s.inputFocused] as any}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...props}
      />
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, color: C.secondaryText, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12, minHeight: 48,
    paddingHorizontal: 14, fontSize: 16, color: '#2A2320', backgroundColor: '#fff', textAlign: 'left',
  },
  inputFocused: { borderColor: C.primary, borderWidth: 1.5 },
});
