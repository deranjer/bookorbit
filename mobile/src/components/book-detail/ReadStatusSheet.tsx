import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReadStatus } from '@/src/api/types';
import { Colors } from '@/src/constants/colors';
import { READ_STATUS_META } from './readStatus';

interface Props {
  visible: boolean;
  current: ReadStatus | null;
  onSelect: (status: ReadStatus) => void;
  onClose: () => void;
}

export function ReadStatusSheet({ visible, current, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Reading Status</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {READ_STATUS_META.map((meta) => {
              const active = current === meta.value;
              return (
                <Pressable
                  key={meta.value}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => onSelect(meta.value)}
                >
                  <Ionicons name={meta.icon} size={22} color={meta.color} style={styles.rowIcon} />
                  <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{meta.label}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={Colors.accent} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  body: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: Colors.surface },
  rowIcon: { width: 30 },
  rowLabel: { flex: 1, color: Colors.text, fontSize: 16 },
  rowLabelActive: { color: Colors.accent, fontWeight: '600' },
});
