import { useState, useEffect, useCallback } from "react";

/**
 * React hook for chrome.storage.local — auto-syncs with storage changes.
 */
export function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    chrome.storage.local.get(key).then((result) => {
      if (result[key] !== undefined) {
        setValue(result[key] as T);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for changes
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[key]) {
        setValue(changes[key].newValue as T);
      }
    };
    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, [key]);

  const update = useCallback(async (newValue: T) => {
    setValue(newValue);
    await chrome.storage.local.set({ [key]: newValue });
  }, [key]);

  return [value, update, loading];
}

/**
 * Hook to listen for background worker messages.
 */
export function useBackgroundMessages(
  handler: (message: { type: string; [key: string]: unknown }) => void
) {
  useEffect(() => {
    const listener = (message: { type: string; [key: string]: unknown }) => {
      handler(message);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [handler]);
}

/**
 * Send a message to the background worker and get a response.
 */
export async function sendMessage(message: { type: string; [key: string]: unknown }): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}
