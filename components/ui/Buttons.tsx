import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { COLORS, RADIUS } from '../../constants/colors';

export function PrimaryButton({ title, onPress, disabled, a11y }: { title: string; onPress: () => void; disabled?: boolean; a11y?: string }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityLabel={a11y ?? title}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        style={[s.btn, disabled && { opacity: 0.5 }] as ViewStyle[]}
      >
        <Text style={s.text}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function OutlineButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.outline}>
      <Text style={s.outlineText}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { backgroundColor: COLORS.primary, minHeight: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  text: { color: '#fff', fontWeight: '700', fontSize: 16 },
  outline: { borderWidth: 1, borderColor: COLORS.border, minHeight: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#fff' },
  outlineText: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
});
