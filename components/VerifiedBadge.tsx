import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const BADGE = require('../assets/verifyed/badge.png');

/** Instagram-style verified seal, rendered inline right after a name. */
export function VerifiedBadge({ size = 18 }: { size?: number }) {
  return (
    <Image
      source={BADGE}
      style={[s.img, { width: size, height: size }]}
      contentFit="contain"
      cachePolicy="memory-disk"
    />
  );
}

const s = StyleSheet.create({
  img: { width: 18, height: 18 },
});
