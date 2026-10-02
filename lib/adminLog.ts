import { supabase } from './supabase';

/**
 * Best-effort admin audit trail → admin_activity_logs (Admin → Activity Logs).
 * NEVER throws: logging must not break the save it describes.
 * RLS allows the insert (`with check (true)`); reads stay scoped
 * (own logs, or all for boss_admin).
 */
export async function logAdminAction(
  action: string,
  entityType: string,
  opts?: { entityId?: string; entityName?: string | null; description?: string | null }
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let snapshot: string | null = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name,last_name,username')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        snapshot =
          `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() ||
          (data as any).username ||
          null;
      }
    } catch {
      // name snapshot is optional
    }
    await supabase.from('admin_activity_logs').insert({
      admin_user_id: user.id,
      admin_name_snapshot: snapshot,
      action,
      entity_type: entityType,
      entity_id: opts?.entityId ?? null,
      entity_name: opts?.entityName ?? null,
      description: opts?.description ?? null,
    });
  } catch {
    // never break the caller
  }
}
