import { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { mapDocument } from '../features/check-in/map-document';
import { handleMapMessage, type CheckInMapProps } from '../features/check-in/map-types';
import { useMapFocus } from '../hooks/use-map-focus';

export function CheckInMap(props: CheckInMapProps) {
  const focused = useMapFocus();
  const ref = useRef<WebView<unknown>>(null);
  const [source] = useState(() => ({ html: mapDocument(), baseUrl: 'https://tiles.openfreemap.org' }));
  const latest = useRef(props);
  useEffect(() => { latest.current = props; ref.current?.injectJavaScript(`window.receiveMapConfig && window.receiveMapConfig(${JSON.stringify(props.config).replace(/</g, '\\u003c')}); true;`); }, [props]);
  const inject = () => ref.current?.injectJavaScript(`window.receiveMapConfig && window.receiveMapConfig(${JSON.stringify(latest.current.config).replace(/</g, '\\u003c')}); true;`);
  return focused ? <WebView<unknown> ref={ref} source={source} style={{ flex: 1 }} javaScriptEnabled scrollEnabled={false} originWhitelist={['*']} onMessage={event => {
    try { if (JSON.parse(event.nativeEvent.data).type === 'ready') inject(); } catch { return; }
    handleMapMessage(event.nativeEvent.data, props);
  }} onShouldStartLoadWithRequest={request => {
    if (request.url === 'about:blank' || /^https:\/\/tiles\.openfreemap\.org\/?$/.test(request.url)) return true;
    if (request.navigationType === 'click' && /^https:\/\//.test(request.url)) void Linking.openURL(request.url).catch(() => {});
    return false;
  }} /> : null;
}
