import type { ThemeColors } from '../../hooks/use-app-theme';
export interface Coordinate { latitude: number; longitude: number }
export interface MapViewport { center: [number, number]; zoom: number }
export interface MapConfig {
  colors: ThemeColors;
  items: (Coordinate & { id: string; title: string; uri: string })[];
  picking?: boolean;
  selected?: Coordinate;
  focus?: Coordinate & { key: string };
  viewport?: MapViewport;
}
export interface CheckInMapProps {
  config: MapConfig;
  onOpen?: (id: string) => void;
  onPick?: (point: Coordinate) => void;
  onMove?: (viewport: MapViewport) => void;
  onPhotoRequest?: (id: string) => void;
}
export function handleMapMessage(raw: unknown, props: CheckInMapProps) {
  try {
    const message = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'open' && props.config.items.some(item => item.id === message.id)) props.onOpen?.(message.id);
    if (message.type === 'photo' && props.config.items.some(item => item.id === message.id)) props.onPhotoRequest?.(message.id);
    if (message.type === 'pick' && props.config.picking && Number.isFinite(message.latitude) && Math.abs(message.latitude) <= 90 && Number.isFinite(message.longitude) && Math.abs(message.longitude) <= 180) props.onPick?.({ latitude: message.latitude, longitude: message.longitude });
    if (message.type === 'move' && Array.isArray(message.viewport?.center) && message.viewport.center.length === 2 && message.viewport.center.every(Number.isFinite) && Number.isFinite(message.viewport.zoom)) props.onMove?.(message.viewport);
  } catch { /* Ignore unrelated or incomplete bridge messages. */ }
}
