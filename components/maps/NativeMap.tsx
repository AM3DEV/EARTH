// Native (iOS/Android) map. Web builds resolve NativeMap.web.tsx instead,
// so react-native-maps (which has no web implementation) is never bundled for web.
import MapView, { Marker } from 'react-native-maps';

export default MapView;
export { Marker };
export type { Region } from 'react-native-maps';
