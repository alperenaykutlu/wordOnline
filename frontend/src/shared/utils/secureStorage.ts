import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'wordle-secure', encryptionKey: 'wrd_s3cr3t_2024' });

export const secureStorage = {
  get:    (key: string): string | null => storage.getString(key) ?? null,
  set:    (key: string, value: string): void => storage.set(key, value),
  delete: (key: string): void => storage.delete(key),
  clear:  (): void => storage.clearAll(),
};
