import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import type { TocItem } from '../bridge';

interface FlatTocItem {
  label: string;
  href: string | null;
  depth: number;
}

function flatten(items: TocItem[], depth = 0, acc: FlatTocItem[] = []): FlatTocItem[] {
  for (const item of items) {
    acc.push({ label: item.label, href: item.href, depth });
    if (item.subitems.length > 0) flatten(item.subitems, depth + 1, acc);
  }
  return acc;
}

interface Props {
  visible: boolean;
  toc: TocItem[];
  onSelect: (href: string) => void;
  onClose: () => void;
}

export function ReaderTocSheet({ visible, toc, onSelect, onClose }: Props) {
  const items = flatten(toc);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Contents</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>
        {items.length === 0 ? (
          <Text style={styles.empty}>No table of contents</Text>
        ) : (
          <ScrollView style={styles.list}>
            {items.map((item, i) => (
              <Pressable
                key={`${item.href ?? 'item'}-${i}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                disabled={!item.href}
                onPress={() => item.href && onSelect(item.href)}
              >
                <Text
                  style={[styles.rowText, { paddingLeft: 4 + item.depth * 16 }, !item.href && styles.rowTextDisabled]}
                  numberOfLines={2}
                >
                  {item.label || 'Untitled'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  empty: { color: Colors.textMuted, fontSize: 14, padding: 24, textAlign: 'center' },
  list: { paddingHorizontal: 8 },
  row: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rowPressed: { opacity: 0.6 },
  rowText: { color: Colors.text, fontSize: 15 },
  rowTextDisabled: { color: Colors.textMuted },
});
