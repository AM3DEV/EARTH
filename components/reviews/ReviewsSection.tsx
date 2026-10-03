import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useReviews } from '../../hooks/useFavorites';
import { COLORS, RADIUS, SHADOW } from '../../constants/colors';
import { Stars } from '../ui/Card';
import { Field } from '../ui/Field';
import { PrimaryButton } from '../ui/Buttons';

/**
 * Reviews section: reviewer photo + name + stars + comment + date,
 * plus a write-a-review form (tappable star picker). Used on
 * monument, event, company and service pages.
 */
export function ReviewsSection({ targetType, targetId }: { targetType: string; targetId: string }) {
  const { t } = useTranslation();
  const { rows: reviews, add } = useReviews(targetType, targetId);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg(null); setBusy(true);
    try {
      await add(rating, comment);
      setComment('');
      setRating(5);
    } catch (e: any) {
      setMsg(e.message === 'Not authenticated' ? t('common.notAuth') : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text style={s.secTitle}>
        {t('detail.reviews')} ({reviews.length})
      </Text>
      {reviews.map((r: any) => {
        const a = r.author ?? null;
        const aname = a
          ? `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || a.username || t('common.guest')
          : t('common.guest');
        return (
          <View key={r.id} style={s.rev}>
            <View style={s.revHead}>
              {a?.avatar_url ? (
                <Image
                  source={{ uri: a.avatar_url }}
                  style={s.revAv}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[s.revAv, s.revAvF]}>
                  <Text style={s.revAvT}>{aname.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.revName} numberOfLines={1}>
                  {aname}
                </Text>
                <Stars value={r.rating} />
              </View>
              {r.created_at ? (
                <Text style={s.revDate}>{String(r.created_at).slice(0, 10)}</Text>
              ) : null}
            </View>
            {r.comment ? <Text style={s.revTxt}>{r.comment}</Text> : null}
          </View>
        );
      })}
      <View style={s.addRev}>
        <Text style={s.writeTitle}>{t('detail.addReview')}</Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${n}`}
              style={s.starBtn}
            >
              <Text style={[s.star, n <= rating && s.starOn]}>★</Text>
            </Pressable>
          ))}
        </View>
        <Field label={t('detail.comment')} value={comment} onChangeText={setComment} multiline />
        {msg ? <Text style={s.err}>{msg}</Text> : null}
        <PrimaryButton title={busy ? '…' : t('common.save')} onPress={submit} disabled={busy} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  secTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 20, marginBottom: 8 },
  rev: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 8, ...SHADOW.card,
  },
  revHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  revAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.softGreen },
  revAvF: { alignItems: 'center', justifyContent: 'center' },
  revAvT: { fontWeight: '800', color: COLORS.primaryDark, fontSize: 16 },
  revName: { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  revDate: { color: COLORS.muted, fontSize: 11 },
  revTxt: { marginTop: 8, color: COLORS.text, fontSize: 14, lineHeight: 20 },
  addRev: { marginTop: 12 },
  writeTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  stars: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  starBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 30, color: COLORS.border },
  starOn: { color: COLORS.gold },
  err: { color: COLORS.error, marginBottom: 8 },
});
