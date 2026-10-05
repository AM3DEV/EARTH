import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Send } from 'lucide-react-native';
import { useErth } from '../../hooks/useErth';
import { RADIUS } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';

export default function ErthTab() {
  const { colors: C } = useTheme();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const { messages, loading, error, send, clear } = useErth();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => { listRef.current?.scrollToEnd({ animated: true }); }, [messages.length]);
  const s = React.useMemo(() => getStyles(C), [C]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrap}>
      <View style={s.head}>
        <Text style={s.title}>Erth / إرث</Text>
        <Pressable onPress={clear}><Text style={s.clear}>{t('erth.newChat')}</Text></Pressable>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <Animated.View entering={FadeInUp.duration(200)} style={[s.bubble, item.role === 'user' ? s.user : s.ai, rtl && { alignSelf: item.role === 'user' ? 'flex-start' : 'flex-end' }]}>
            <Text style={[s.msg, item.role === 'user' && { color: '#fff' }]}>{item.content}</Text>
          </Animated.View>
        )}
        ListEmptyComponent={<Text style={s.hint}>Petra, Wadi Rum, Jerash… {t('erth.placeholder')}</Text>}
      />
      {loading ? <Text style={s.typing}>{t('erth.typing')}</Text> : null}
      {error ? <Text style={s.err}>{t('erth.error')} ({error})</Text> : null}
      <View style={[s.row, rtl && { flexDirection: 'row-reverse' }]}>
        <TextInput value={text} onChangeText={setText} placeholder={t('erth.placeholder')} placeholderTextColor={C.secondaryText} style={[s.input, { textAlign: rtl ? 'right' : 'left' }]} onSubmitEditing={() => { send(text); setText(''); }} />
        <Pressable accessibilityLabel={t('erth.send')} onPress={() => { send(text); setText(''); }} style={s.send}>
          <Send color="#fff" size={18} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 56 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  clear: { color: C.primary, fontWeight: '600' },
  bubble: { maxWidth: '82%', borderRadius: RADIUS.lg, padding: 12, alignSelf: 'flex-end' },
  user: { backgroundColor: C.primary, alignSelf: 'flex-end' },
  ai: { backgroundColor: C.card, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border },
  msg: { fontSize: 15, color: C.text },
  hint: { color: C.secondaryText, textAlign: 'center', marginTop: 40 },
  typing: { color: C.secondaryText, paddingHorizontal: 16, fontStyle: 'italic' },
  err: { color: C.error, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: C.border },
  input: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.full, minHeight: 48, paddingHorizontal: 16, fontSize: 16, color: C.text },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});
