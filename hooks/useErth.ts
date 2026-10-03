import { useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

interface Msg { id: string; role: 'user' | 'assistant'; content: string; }

/** Erth chat via secure Edge Function erth-chat (AI key stays server-side). */
export function useErth(conversationId?: string | null) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Persist the server conversation across sends so every message continues
  // the SAME conversation (new one only via clear(), i.e. the New Chat button).
  const [cid, setCid] = useState<string | null>(conversationId ?? null);
  // Tourist position (when permitted): sent with every message so Erth can
  // recommend what's actually around them (e.g. in Petra → Petra options).
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const p = await Location.requestForegroundPermissionsAsync();
        if (p.status !== 'granted') return;
        const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setPos({ lat: cur.coords.latitude, lng: cur.coords.longitude });
      } catch {
        // location stays null → Erth answers generally
      }
    })();
  }, []);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setError(null);
    const um: Msg = { id: `u-${Date.now()}`, role: 'user', content: q };
    setMessages((m) => [...m, um]);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/erth-chat`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: q, conversation_id: cid, lat: pos?.lat ?? null, lng: pos?.lng ?? null }),
      });
      let json: any = null;
      try { json = await res.json(); } catch { /* non-JSON body */ }
      if (!res.ok) throw new Error(json?.error ? String(json.error) : `AI error ${res.status}`);
      if (json.conversation_id) setCid(json.conversation_id);
      const am: Msg = { id: `a-${Date.now()}`, role: 'assistant', content: json.reply ?? '' };
      setMessages((m) => [...m, am]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cid, pos]);

  const clear = useCallback(() => { setMessages([]); setCid(null); }, []);

  return { messages, loading, error, send, clear };
}
