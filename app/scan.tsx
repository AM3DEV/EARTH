import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft } from 'lucide-react-native';
import { scanCompanyQr } from '../hooks/useBookings';
import { COLORS, RADIUS } from '../constants/colors';
import { LoadingState } from '../components/ui/States';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';

/** Scan a store QR (JG1:token) to earn loyalty points. One award per store per day (server-enforced). */
export default function ScanScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ awarded: number; balance: number; company_name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { width: W } = useWindowDimensions();
  const box = W - 32;

  useFocusEffect(
    useCallback(() => {
      setDone(false);
      setResult(null);
      setErr(null);
      setBusy(false);
    }, [])
  );

  if (!permission) return <LoadingState />;
  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.title}>{t('loyalty.scanTitle')}</Text>
        <Text style={s.muted}>{t('loyalty.cameraNeeded')}</Text>
        <View style={{ height: 16 }} />
        <PrimaryButton title={t('loyalty.allowCamera')} onPress={requestPermission} />
      </View>
    );
  }

  const onScan = async ({ data }: { data: string }) => {
    if (done || busy) return;
    setDone(true);
    setBusy(true);
    setErr(null);
    try {
      const r = await scanCompanyQr(data);
      setResult(r);
    } catch (e: any) {
      setErr(e.message === 'Invalid QR code' ? t('loyalty.badQr') : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          {rtl ? <ArrowLeft color={COLORS.text} size={20} style={{ transform: [{ scaleX: -1 }] }} /> : <ArrowLeft color={COLORS.text} size={20} />}
        </Pressable>
        <Text style={s.title}>{t('loyalty.scanTitle')}</Text>
      </View>
      <View style={[s.camWrap, { width: box, height: box }]}>
        <CameraView
          style={s.cam}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={done ? undefined : onScan}
        />
        <View style={s.frame} pointerEvents="none" />
      </View>
      <View style={s.sheet}>
        {busy ? <Text style={s.muted}>{t('common.loading')}</Text> : null}
        {err ? (
          <>
            <Text style={s.err}>{err}</Text>
            <View style={{ height: 10 }} />
            <SecondaryButton title={t('common.retry')} onPress={() => { setDone(false); setErr(null); }} />
          </>
        ) : null}
        {result ? (
          <>
            <Text style={s.win}>+{result.awarded} {t('loyalty.points')}</Text>
            <Text style={s.muted}>{result.company_name} · {t('loyalty.balance')}: {result.balance}</Text>
            <View style={{ height: 12 }} />
            <PrimaryButton title={t('loyalty.viewWallet')} onPress={() => router.push('/loyalty' as any)} />
            <View style={{ height: 8 }} />
            <SecondaryButton title={t('loyalty.scanAgain')} onPress={() => { setDone(false); setResult(null); }} />
          </>
        ) : !err && !busy ? (
          <Text style={s.muted}>{t('loyalty.pointAtQr')}</Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  center: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
  camWrap: { borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: '#000', alignSelf: 'center', marginTop: 16 },
  cam: { flex: 1 },
  frame: { position: 'absolute', left: '12%', right: '12%', top: '12%', bottom: '12%', borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 18 },
  sheet: { padding: 20, alignItems: 'center' },
  muted: { color: COLORS.secondaryText, textAlign: 'center', fontSize: 14 },
  err: { color: COLORS.error, textAlign: 'center', fontWeight: '600' },
  win: { fontSize: 34, fontWeight: '800', color: COLORS.primaryDark },
});
