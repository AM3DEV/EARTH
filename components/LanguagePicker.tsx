import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LANGS, applyLocale } from '../lib/i18n';
import { COLORS, RADIUS } from '../constants/colors';

/** Frosted globe pill for photo backgrounds (splash, onboarding, login). */
export function LanguageButton({ onPress }: { onPress: () => void }) {
  const { i18n } = useTranslation();
  return (
    <Pressable onPress={onPress} style={s.btn} accessibilityRole="button" accessibilityLabel="Language">
      <Text style={s.globe}>🌐</Text>
      <Text style={s.txt}>{i18n.language.toUpperCase()}</Text>
    </Pressable>
  );
}

/** Bottom-sheet list of the 10 app languages. */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { i18n } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>🌐 Language</Text>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={[...LANGS]}
            keyExtractor={(l) => l.code}
            renderItem={({ item: l }) => (
              <Pressable
                key={l.code}
                onPress={async () => { await applyLocale(l.code); onClose(); }}
                style={[s.opt, i18n.language === l.code && s.optActive]}
                accessibilityRole="button"
                accessibilityLabel={l.name}
              >
                <Text style={s.optTxt}>{l.name}</Text>
                {i18n.language === l.code ? <Text style={s.check}>✓</Text> : null}
              </Pressable>
            )}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 9,
  },
  globe: { fontSize: 17 },
  txt: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 28 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 18, color: COLORS.secondaryText },
  opt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderColor: COLORS.border },
  optActive: { backgroundColor: COLORS.softGreen },
  optTxt: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  check: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 16 },
});
