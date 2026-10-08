import { File } from 'expo-file-system';
export async function photoBytes(uri: string): Promise<{ bytes: ArrayBuffer; type: string }> {
  const file = new File(uri);
  return { bytes: await file.arrayBuffer(), type: file.type || 'image/jpeg' };
}
