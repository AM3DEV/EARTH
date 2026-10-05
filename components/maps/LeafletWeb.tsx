// Client-only Leaflet map for web. NEVER imported during server/static render —
// NativeMap.web.tsx loads this lazily after mount (Leaflet needs `window`).
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { MapContainer, TileLayer, Marker as RLMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../lib/theme';
import { CARTO_DAY, CARTO_NIGHT, cartoWebUrl, tileAttribution } from '../../constants/mapStyle';

export type WebRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export function zoomFor(latitudeDelta = 4.5): number {
  const z = Math.round(Math.log2(360 / Math.max(latitudeDelta, 0.0001)));
  return Math.max(2, Math.min(18, z));
}

function toLatLng(r: WebRegion): [number, number] {
  return [r.latitude, r.longitude];
}

/** Colored dot marker (inline-styled divIcon — no image assets for the bundler to resolve). */
function dot(color = '#E11D48', opacity = 1) {
  return L.divIcon({
    className: 'jg-map-dot',
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:${color};opacity:${opacity};border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

type MapProps = {
  style?: any;
  children?: React.ReactNode;
  initialRegion?: WebRegion;
  scrollEnabled?: boolean;
  [key: string]: any;
};

export const LeafletMap = forwardRef<any, MapProps>(function LeafletMap(
  { style, children, initialRegion, scrollEnabled = true },
  ref
) {
  const mapRef = useRef<L.Map | null>(null);
  const { dark } = useTheme();
  useImperativeHandle(
    ref,
    () => ({
      // Same shape the native screens call: mapRef.current?.animateToRegion(region, ms)
      animateToRegion: (r: WebRegion, duration = 600) => {
        mapRef.current?.flyTo(toLatLng(r), zoomFor(r.latitudeDelta), {
          duration: Math.max(duration, 1) / 1000,
        });
      },
    }),
    []
  );
  const c: WebRegion = initialRegion ?? {
    latitude: 31.24,
    longitude: 36.51,
    latitudeDelta: 4.5,
    longitudeDelta: 4.5,
  };
  return (
    <View style={style}>
      <MapContainer
        ref={mapRef}
        center={toLatLng(c)}
        zoom={zoomFor(c.latitudeDelta)}
        scrollWheelZoom={scrollEnabled}
        dragging={scrollEnabled}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url={cartoWebUrl(dark ? CARTO_NIGHT : CARTO_DAY)}
          attribution={tileAttribution()}
        />
        {children}
      </MapContainer>
    </View>
  );
});

type MarkerProps = {
  coordinate?: { latitude: number; longitude: number };
  pinColor?: string;
  title?: string;
  onPress?: () => void;
  opacity?: number;
};

export function LeafletMarker({ coordinate, pinColor, title, onPress, opacity }: MarkerProps) {
  if (!coordinate) return null;
  return (
    <RLMarker
      position={[coordinate.latitude, coordinate.longitude]}
      icon={dot(pinColor, opacity ?? 1)}
      eventHandlers={{ click: () => onPress?.() }}
    >
      {title ? <Tooltip>{title}</Tooltip> : null}
    </RLMarker>
  );
}
