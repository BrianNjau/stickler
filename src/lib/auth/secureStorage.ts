import * as SecureStore from 'expo-secure-store';

import { countKey, joinChunks, partKey, splitIntoChunks } from './chunks';

/**
 * Supabase auth storage backed by the iOS Keychain / Android Keystore (expo-secure-store).
 * A session is often larger than one SecureStore item allows, so values are chunked.
 * Native only: SecureStore has no web implementation; web uses the browser's own storage.
 */
export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = Number(await SecureStore.getItemAsync(countKey(key)));
    if (!Number.isInteger(n) || n <= 0) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(partKey(key, i))));
    return joinChunks(parts);
  },

  async setItem(key: string, value: string): Promise<void> {
    const previous = Number(await SecureStore.getItemAsync(countKey(key))) || 0;
    const chunks = splitIntoChunks(value);
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(partKey(key, i), c)));
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    // A shorter session than last time leaves stale parts behind; clear them.
    for (let i = chunks.length; i < previous; i++) await SecureStore.deleteItemAsync(partKey(key, i));
  },

  async removeItem(key: string): Promise<void> {
    const n = Number(await SecureStore.getItemAsync(countKey(key))) || 0;
    await SecureStore.deleteItemAsync(countKey(key));
    await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(partKey(key, i))));
  },
};
