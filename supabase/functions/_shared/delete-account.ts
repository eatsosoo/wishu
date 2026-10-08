// This sequence is shared with tests; Auth must never be deleted before photos.
export interface AccountDeletionBackend {
  prepare: (userId: string) => Promise<void>;
  photos: (userId: string) => Promise<string[]>;
  removePhotos: (paths: string[]) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

export async function deleteAccountData(userId: string, backend: AccountDeletionBackend): Promise<void> {
  await backend.prepare(userId);
  for (;;) {
    const paths = await backend.photos(userId);
    if (!paths.length) break;
    await backend.removePhotos(paths);
  }
  await backend.deleteUser(userId);
}
