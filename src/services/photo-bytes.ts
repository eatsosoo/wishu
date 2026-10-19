export async function photoBytes(uri: string): Promise<{ bytes: ArrayBuffer; type: string }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return { bytes: await blob.arrayBuffer(), type: blob.type || 'image/jpeg' };
}
export async function photoSize(uri: string): Promise<number> {
  const response = await fetch(uri);
  return (await response.blob()).size;
}
