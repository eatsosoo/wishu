import { useEffect, useRef, useState } from 'react';
import { mapDocument } from '../features/check-in/map-document';
import { handleMapMessage, type CheckInMapProps } from '../features/check-in/map-types';
import { useMapFocus } from '../hooks/use-map-focus';

export function CheckInMap(props: CheckInMapProps) {
  const focused = useMapFocus();
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef(props);
  const [html] = useState(mapDocument);
  useEffect(() => { latest.current = props; }, [props]);
  const configMessage = JSON.stringify({ type: 'config', config: props.config });
  useEffect(() => { if (focused) frame.current?.contentWindow?.postMessage(configMessage, '*'); }, [configMessage, focused]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (typeof event.data === 'string') {
        try { if (JSON.parse(event.data).type === 'ready') frame.current?.contentWindow?.postMessage({ type: 'config', config: latest.current.config }, '*'); } catch { return; }
      }
      handleMapMessage(event.data, latest.current);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return focused ? <iframe ref={frame} title="Bản đồ kỷ niệm" srcDoc={html} sandbox="allow-scripts" style={{ width: '100%', height: '100%', border: 0 }} onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'config', config: latest.current.config }, '*')} /> : null;
}
