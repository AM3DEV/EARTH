import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type AnyProps = { style?: any; children?: React.ReactNode; [key: string]: any };

// Web map entry. SSR-safe: Leaflet touches `window`, so LeafletWeb is imported
// lazily after mount. Server/static render gets a placeholder; the real
// interactive map (OpenStreetMap + markers) hydrates in the browser.
const WebMapInner = forwardRef<any, AnyProps>(function WebMapInner({ style, ...rest }, ref) {
  const [ClientMap, setClientMap] = useState<any>(null);
  const innerRef = useRef<any>(null);

  useEffect(() => {
    let on = true;
    import('./LeafletWeb').then((m) => {
      if (on) setClientMap(() => m.LeafletMap);
    });
    return () => {
      on = false;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (...a: any[]) => innerRef.current?.animateToRegion(...a),
    }),
    []
  );

  if (!ClientMap) {
    return (
      <View style={[style, s.ph]}>
        <Text style={s.t}>Loading map…</Text>
      </View>
    );
  }
  return <ClientMap {...rest} style={style} ref={innerRef} />;
});

export default WebMapInner;

export function Marker(props: AnyProps) {
  const [ClientMarker, setClientMarker] = useState<any>(null);
  useEffect(() => {
    let on = true;
    import('./LeafletWeb').then((m) => {
      if (on) setClientMarker(() => m.LeafletMarker);
    });
    return () => {
      on = false;
    };
  }, []);
  if (!ClientMarker) return null;
  return <ClientMarker {...props} />;
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
