import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

const CHUNK_SIZE = 1800;

// ─── Web: use localStorage (SecureStore is native-only) ───────────────────────
const webStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

// ─── Native: use SecureStore with chunking (synchronous require, not async import) ──
// Using require() here so the adapter is a plain object, NOT a Promise.
// If we used "await import()" the storage field would be a Promise and
// supabase-js would call .getItem on it → "not a function" crash.
function buildNativeAdapter() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SecureStore = require("expo-secure-store");

  return {
    async getItem(key: string): Promise<string | null> {
      const chunkCountRaw = await SecureStore.getItemAsync(`${key}__chunks`);
      if (!chunkCountRaw) return SecureStore.getItemAsync(key);

      const chunkCount = Number.parseInt(chunkCountRaw, 10);
      if (Number.isNaN(chunkCount) || chunkCount <= 0) return null;

      const chunks: string[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}__${i}`);
        if (chunk == null) return null;
        chunks.push(chunk);
      }
      return chunks.join("");
    },

    async setItem(key: string, value: string): Promise<void> {
      await this.removeItem(key);
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
      const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}__chunks`, String(chunkCount));
      for (let i = 0; i < chunkCount; i++) {
        const start = i * CHUNK_SIZE;
        await SecureStore.setItemAsync(`${key}__${i}`, value.slice(start, start + CHUNK_SIZE));
      }
    },

    async removeItem(key: string): Promise<void> {
      await SecureStore.deleteItemAsync(key);
      const chunkCountRaw = await SecureStore.getItemAsync(`${key}__chunks`);
      if (!chunkCountRaw) return;
      const chunkCount = Number.parseInt(chunkCountRaw, 10);
      if (!Number.isNaN(chunkCount) && chunkCount > 0) {
        for (let i = 0; i < chunkCount; i++) {
          await SecureStore.deleteItemAsync(`${key}__${i}`);
        }
      }
      await SecureStore.deleteItemAsync(`${key}__chunks`);
    },
  };
}

// Pick adapter synchronously — no Promises involved
const storageAdapter =
  Platform.OS === "web" ? webStorageAdapter : buildNativeAdapter();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
