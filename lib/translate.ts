import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// In-memory cache so scrolling back never re-translates.
const mem = new Map<string, string>();

/**
 * Auto-translate a place description into the tourist's language.
 * Arabic/English use the stored columns directly; other languages go through
 * the translate-text edge function (Groq + DB cache). Falls back to the
 * source text silently while loading or on any error.
 */
export function useAutoTranslation(
  kind: string,
  id: string | undefined,
  source: string | null | undefined,
  lang: string
) {
  const [text, setText] = useState<string>(source ?? '');
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    setText(source ?? '');
    if (!source?.trim() || !id || lang === 'ar' || lang === 'en') return;
    const key = `${kind}:${id}:${lang}:${source}`;
    const hit = mem.get(key);
    if (hit) {
      setText(hit);
      return;
    }
    let on = true;
    setTranslating(true);
    supabase.functions
      .invoke('translate-text', { body: { kind, id, lang, source } })
      .then(({ data, error }) => {
        if (!on) return;
        const t = (data as any)?.text;
        if (!error && typeof t === 'string' && t.trim()) {
          mem.set(key, t);
          setText(t);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (on) setTranslating(false);
      });
    return () => {
      on = false;
    };
  }, [kind, id, source, lang]);

  return { text, translating };
}
