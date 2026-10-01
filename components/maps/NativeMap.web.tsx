import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type AnyProps = { style?: any; children?: React.ReactNode; [key: string]: any };

// Web stub — react-native-maps has no web implementation.
// This placeholder keeps `expo export --platform all` (static route rendering)
// working; the full interactive map stays native-only.
export default function WebMapPlaceholder({ style }: AnyProps) {
  return (
    <View style={[style, s.ph]}>
      <Text style={s.t}>Map view is available in the mobile app</Text>
    </View>
  );
}

export function Marker() {
  return null;
}

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const s = StyleSheet.create({
  ph: { backgroundColor: '#EAEFF5', alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  t: { color: '#5B6B7B', fontWeight: '600', padding: 16, textAlign: 'center' },
});
