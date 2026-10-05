// supabase/functions/translate-text/index.ts
// Auto-translate a place description into the tourist's language (Groq).
//  - verifies Supabase JWT (tourist must be logged in)
//  - read-through cache in place_translations (service role)
//  - returns the cached translation when the source text is unchanged
//
// Required secrets (Supabase Dashboard > Edge Functions > Secrets):
//   GROQ_API_KEY   -> same key as erth-chat (https://groq.com)
// Optional: ERTH_MODEL -> default "llama-3.3-70b-versatile"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const LANG_NAMES: Record<string, string> = {
  en: 'English', ar: 'Arabic', fr: 'French', de: 'German', es: 'Spanish',
  it: 'Italian', ru: 'Russian', tr: 'Turkish', zh: 'Simplified Chinese', nl: 'Dutch',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) throw new Error('Translator not configured (missing GROQ_API_KEY)');
    const model = Deno.env.get('ERTH_MODEL') || DEFAULT_MODEL;

    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });

    const { kind, id, lang, source } = await req.json();
    const target = String(lang ?? 'en').slice(0, 5);
    const src = String(source ?? '').slice(0, 2000);
    if (!src.trim() || !LANG_NAMES[target]) {
      return new Response(JSON.stringify({ text: src }), { headers: cors });
    }

    const admin = createClient(url, serviceKey);

    // Read-through cache: same source text => same translation.
    const { data: hit } = await admin
      .from('place_translations')
      .select('translated_text,source_text')
      .eq('place_kind', String(kind ?? 'company'))
      .eq('place_id', String(id ?? ''))
      .eq('lang', target)
      .maybeSingle();
    if (hit && hit.source_text === src) {
      return new Response(JSON.stringify({ text: hit.translated_text, cached: true }), { headers: cors });
    }

    const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content: `Translate the following tourism description into ${LANG_NAMES[target]}. Rules: return ONLY the translation, no quotes, no commentary, no extra sentences. Keep place names in their original form. Preserve the original meaning and tone.`,
          },
          { role: 'user', content: src },
        ],
      }),
    });
    if (!gr.ok) throw new Error(`Groq error ${gr.status}`);
    const gj = await gr.json();
    const out: string = (gj.choices?.[0]?.message?.content ?? '').trim();
    if (!out) throw new Error('Empty translation');

    await admin.from('place_translations').upsert(
      {
        place_kind: String(kind ?? 'company'),
        place_id: String(id ?? ''),
        lang: target,
        source_text: src,
        translated_text: out,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'place_kind,place_id,lang' }
    );

    return new Response(JSON.stringify({ text: out, cached: false }), { headers: cors });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Translate failed' }), { status: 500, headers: cors });
  }
});
