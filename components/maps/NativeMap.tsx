// Native (iOS/Android) map. Web builds resolve NativeMap.web.tsx instead,
// so react-native-maps (which has no web implementation) is never bundled for web.
//
// CARTO basemap (API key in constants/mapStyle.ts): the base map renders from
// CARTO raster tiles on both modes — Voyager by day, dark matter at night.
import React, { forwardRef } from 'react';
import RNMapView, { Marker, UrlTile } from 'react-native-maps';
import { useTheme } from '../../lib/theme';
import { CARTO_DAY, CARTO_NIGHT, cartoNativeUrl } from '../../constants/mapStyle';

type AnyProps = { customMapStyle?: any[]; [key: string]: any };

const ThemedMapView = forwardRef<any, AnyProps>(function ThemedMapView(
  { customMapStyle, children, ...rest },
  ref
) {
  const { dark } = useTheme();
  return (
    <RNMapView ref={ref} mapType="none" {...rest}>
      <UrlTile
        urlTemplate={cartoNativeUrl(dark ? CARTO_NIGHT : CARTO_DAY)}
        maximumZ={19}
        flipY={false}
      />
      {children}
    </RNMapView>
  );
});

export default ThemedMapView as unknown as typeof RNMapView;
export { Marker };
export type { Region } from 'react-native-maps';
