import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

const CHUNK_SIZE = 1800;

const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}__chunks`);

    if (!chunkCountRaw) {
      return SecureStore.getItemAsync(key);
    }

    const chunkCount = Number.parseInt(chunkCountRaw, 10);
    if (Number.isNaN(chunkCount) || chunkCount <= 0) {
      return null;
    }

    const chunks: string[] = [];
    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = await SecureStore.getItemAsync(`${key}__${index}`);
      if (chunk == null) return null;
      chunks.push(chunk);
    }

    return chunks.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    // Clear any previous storage shape first.
    await this.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}__chunks`, String(chunkCount));

    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * CHUNK_SIZE;
      const end = start + CHUNK_SIZE;
      const chunk = value.slice(start, end);
      await SecureStore.setItemAsync(`${key}__${index}`, chunk);
    }
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);

    const chunkCountRaw = await SecureStore.getItemAsync(`${key}__chunks`);
    if (!chunkCountRaw) return;

    const chunkCount = Number.parseInt(chunkCountRaw, 10);
    if (!Number.isNaN(chunkCount) && chunkCount > 0) {
      for (let index = 0; index < chunkCount; index += 1) {
        await SecureStore.deleteItemAsync(`${key}__${index}`);
      }
    }

    await SecureStore.deleteItemAsync(`${key}__chunks`);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
