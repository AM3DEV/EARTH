export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const isUsername = (v: string) => /^[a-zA-Z0-9_.-]{3,30}$/.test(v.trim());
export const isStrongPassword = (v: string) => v.length >= 8;
export const isPct = (v: number) => Number.isFinite(v) && v >= 0 && v <= 100;
export const isMoney = (v: number) => Number.isFinite(v) && v >= 0;
export const isLat = (v: number) => Number.isFinite(v) && v >= -90 && v <= 90;
export const isLng = (v: number) => Number.isFinite(v) && v >= -180 && v <= 180;
export const isUrl = (v: string) => { try { const u = new URL(v); return !!u.protocol.startsWith('http'); } catch { return false; } };
export const isPhone = (v: string) => /^[+\d][\d\s-]{5,20}$/.test(v.trim());
