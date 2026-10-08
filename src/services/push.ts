export async function registerPush(_requestPermission = true): Promise<string> {
  throw new Error('Push notification dùng trên bản cài Android/iOS. Bạn vẫn có thể đọc thông báo trong app.');
}
export async function unregisterPush() {}
