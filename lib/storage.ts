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

export async function uploadImage(kind: string, localUri: string, fileName: string): Promise<string> {
  const bucket = BUCKET_BY_KIND[kind] ?? 'avatars';
  const res = await fetch(localUri);
  const blob = await res.blob();
  if (blob.size > 5 * 1024 * 1024) throw new Error('Image too large (max 5MB)');
  const ext = (fileName.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${Date.now()}-${fileName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: CONTENT_TYPE_BY_EXT[ext] ?? 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
