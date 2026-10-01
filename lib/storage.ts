import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';

const BUCKET_BY_KIND: Record<string, string> = {
  avatar: 'avatars', monument: 'monuments', event: 'events',
  company: 'companies', service: 'services', category: 'categories',
};

export async function pickImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo permission denied');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images', allowsEditing: true, quality: 0.75,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0].uri;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
};

/**
 * Derive a safe extension from a picker URI. Content URIs (Android
 * `content://…`, iOS `ph://…`, web blobs) often have NO extension — naive
 * `split('.').pop()` then yields garbage like `app/` and produces broken
 * storage keys (e.g. `….app/`) that upload "successfully" but can never be
 * read back. Anything unrecognized falls back to jpg.
 */
function safeExt(uri: string): string {
  const m = uri.toLowerCase().match(/\.([a-z0-9]{2,4})(?:\?|$)/);
  const e = m?.[1] ?? 'jpg';
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(e) ? e : 'jpg';
}

export async function uploadImage(kind: string, localUri: string, fileName: string): Promise<string> {
  const bucket = BUCKET_BY_KIND[kind] ?? 'avatars';
  let blob: Blob;
  try {
    const res = await fetch(localUri);
    blob = await res.blob();
  } catch {
    throw new Error('Could not read the picked image. Try another photo.');
  }
  if (blob.size > 5 * 1024 * 1024) throw new Error('Image too large (max 5MB)');
  // Sanitize: strip path separators / query junk, force a valid extension.
  const ext = safeExt(localUri);
  const clean = (fileName.replace(/[^a-zA-Z0-9._-]/g, '').replace(/^\.+/, '') || `img-${Date.now()}`)
    .replace(/\.[a-zA-Z0-9]{1,5}$/, '');
  const path = `${Date.now()}-${clean}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: CONTENT_TYPE_BY_EXT[ext] ?? 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  // Guard: if the bucket isn't PUBLIC, the URL below returns 403 and the
  // picture silently "doesn't appear". Fail loudly with an actionable message.
  try {
    const head = await fetch(data.publicUrl, { method: 'HEAD' });
    if (head.status === 400 || head.status === 401 || head.status === 403 || head.status === 404) {
      throw new Error(
        `Uploaded but not publicly readable (HTTP ${head.status}). ` +
        `Make the "${bucket}" bucket PUBLIC: Supabase Dashboard → Storage → ${bucket} → ••• → "Make public".`
      );
    }
  } catch (e: any) {
    if (String(e?.message ?? '').includes('not publicly readable')) throw e;
    // Network hiccup on the check itself — don't block the save.
  }
  return data.publicUrl;
}
