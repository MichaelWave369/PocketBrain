import type { AppSettings, ChatMessage, MemorySummary } from '../types';

const DB_NAME = 'pocketbrain-db';
const DB_VERSION = 1;
const CHAT_STORE = 'chat_messages';
const SUMMARY_STORE = 'memory_summary';
const SETTINGS_STORE = 'settings';

const openDb = async (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHAT_STORE)) {
        db.createObjectStore(CHAT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SUMMARY_STORE)) {
        db.createObjectStore(SUMMARY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = action(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
};

export const saveMessage = async (message: ChatMessage): Promise<void> => {
  await withStore(CHAT_STORE, 'readwrite', (store) => store.put(message));
};

export const getMessages = async (): Promise<ChatMessage[]> => {
  const messages = await withStore(CHAT_STORE, 'readonly', (store) => store.getAll());
  return messages.sort((a, b) => a.createdAt - b.createdAt);
};

export const clearMessages = async (): Promise<void> => {
  await withStore(CHAT_STORE, 'readwrite', (store) => store.clear());
};

export const saveSummary = async (summary: MemorySummary): Promise<void> => {
  await withStore(SUMMARY_STORE, 'readwrite', (store) => store.put(summary));
};

export const getSummary = async (): Promise<MemorySummary | null> => {
  const summaries = await withStore(SUMMARY_STORE, 'readonly', (store) => store.getAll());
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await withStore(SETTINGS_STORE, 'readwrite', (store) => store.put({ ...settings, id: 'app-settings' }));
};

export const getSettings = async (): Promise<AppSettings | null> => {
  const item = await withStore<{ id: string } & AppSettings | undefined>(
    SETTINGS_STORE,
    'readonly',
    (store) => store.get('app-settings')
  );

  if (!item) {
    return null;
  }

  const { localOnlyMode, selectedModel } = item;
  return { localOnlyMode, selectedModel };
};

export const exportMemory = async (): Promise<string> => {
  const [messages, summary, settings] = await Promise.all([getMessages(), getSummary(), getSettings()]);
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    messages,
    summary,
    settings
  }, null, 2);
};

export const importMemory = async (raw: string): Promise<void> => {
  const parsed = JSON.parse(raw) as {
    messages?: ChatMessage[];
    summary?: MemorySummary;
    settings?: AppSettings;
  };

  await clearMessages();

  if (parsed.messages?.length) {
    await Promise.all(parsed.messages.map((message) => saveMessage(message)));
  }

  if (parsed.summary) {
    await saveSummary(parsed.summary);
  }

  if (parsed.settings) {
    await saveSettings(parsed.settings);
  }
};
