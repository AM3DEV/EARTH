/** Map raw booking status values to i18n keys. RPCs still receive the raw English values. */
export function bookingStatusKey(st: string): string | null {
  switch (String(st ?? '').toLowerCase()) {
    case 'pending': return 'booking.stPending';
    case 'confirmed': return 'booking.stConfirmed';
    case 'rejected': return 'booking.stRejected';
    case 'cancelled': return 'booking.stCancelled';
    case 'completed': return 'booking.stCompleted';
    default: return null;
  }
}

/** Map raw admin workflow statuses (promotions/support) to i18n keys. */
export function adminStatusKey(st: string): string | null {
  switch (String(st ?? '').toLowerCase()) {
    case 'active': return 'admin.stActive';
    case 'scheduled': return 'admin.stScheduled';
    case 'expired': return 'admin.stExpired';
    case 'cancelled': return 'booking.stCancelled';
    case 'pending':
    case 'pending_allocation': return 'admin.statPending';
    default: return null;
  }
}

/** Map review target types to translated section names. */
export function targetKindLabel(targetType: string, t: (k: string) => string): string {
  switch (String(targetType ?? '').toLowerCase()) {
    case 'monument': return t('admin.monuments');
    case 'event': return t('admin.events');
    case 'company': return t('admin.companies');
    case 'service': return t('admin.services');
    case 'category': return t('admin.categories');
    case 'store_item': return t('store.title');
    case 'booking': return t('admin.bookings');
    case 'event_promotion': return t('admin.promotions');
    case 'event_support_discount': return t('admin.supportPricing');
    case 'user_role': return t('admin.administrators');
    default: return String(targetType ?? '');
  }
}

/** Map client log action verbs to translated labels; server sentences pass through. */
export function logActionLabel(action: string, t: (k: string) => string): string {
  switch (String(action ?? '').toLowerCase()) {
    case 'create': return t('admin.actCreate');
    case 'update': return t('admin.actUpdate');
    case 'delete': return t('admin.actDelete');
    case 'activate': return t('admin.actActivate');
    case 'deactivate': return t('admin.actDeactivate');
    case 'verify': return t('admin.actVerify');
    case 'unverify': return t('admin.actUnverify');
    default: return String(action ?? '');
  }
}
