import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../constants/colors';

/** Primary CTA — terracotta orange, white text, 50px, soft shadow. */
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
        style={[s.btn, disabled && s.disabled] as ViewStyle[]}
      >
        <Text style={s.text}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Secondary — white fill, terracotta text, hairline border. */
export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.secondary}>
      <Text style={s.secondaryText}>{title}</Text>
    </Pressable>
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
  btn: {
    backgroundColor: COLORS.primary, minHeight: 50, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, ...SHADOW.card,
  },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border,
    minHeight: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  secondaryText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 16 },
  outline: { borderWidth: 1.5, borderColor: COLORS.primary, minHeight: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'transparent' },
  outlineText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 15 },
});
