import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import {
  clampFontSize,
  clampLineHeight,
  FONT_FAMILIES,
  FONT_SIZE_RANGE,
  LINE_HEIGHT_RANGE,
  type ReaderSettings,
} from '../settings';
import { READER_THEMES } from '../themes';

interface Props {
  visible: boolean;
  settings: ReaderSettings;
  onChange: (patch: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
  canDec,
  canInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable style={[styles.stepBtn, !canDec && styles.stepBtnDisabled]} onPress={onDec} disabled={!canDec} hitSlop={6}>
          <Ionicons name="remove" size={20} color={canDec ? Colors.text : Colors.textMuted} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable style={[styles.stepBtn, !canInc && styles.stepBtnDisabled]} onPress={onInc} disabled={!canInc} hitSlop={6}>
          <Ionicons name="add" size={20} color={canInc ? Colors.text : Colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

export function ReaderSettingsSheet({ visible, settings, onChange, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Display</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Light / Dark */}
          <View style={styles.stepperRow}>
            <Text style={styles.rowLabel}>Dark mode</Text>
            <View style={styles.segment}>
              <Pressable
                style={[styles.segmentBtn, !settings.isDark && styles.segmentBtnActive]}
                onPress={() => onChange({ isDark: false })}
              >
                <Ionicons name="sunny-outline" size={18} color={!settings.isDark ? Colors.bg : Colors.text} />
              </Pressable>
              <Pressable
                style={[styles.segmentBtn, settings.isDark && styles.segmentBtnActive]}
                onPress={() => onChange({ isDark: true })}
              >
                <Ionicons name="moon-outline" size={18} color={settings.isDark ? Colors.bg : Colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Theme swatches */}
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.themeGrid}>
            {READER_THEMES.map((theme) => {
              const mode = settings.isDark ? theme.dark : theme.light;
              const active = settings.themeName === theme.name;
              return (
                <Pressable
                  key={theme.name}
                  style={[styles.swatch, { backgroundColor: mode.bg }, active && styles.swatchActive]}
                  onPress={() => onChange({ themeName: theme.name })}
                >
                  <Text style={[styles.swatchText, { color: mode.fg }]}>Aa</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Font size */}
          <Stepper
            label="Font size"
            value={`${settings.fontSize}`}
            canDec={settings.fontSize > FONT_SIZE_RANGE.min}
            canInc={settings.fontSize < FONT_SIZE_RANGE.max}
            onDec={() => onChange({ fontSize: clampFontSize(settings.fontSize - FONT_SIZE_RANGE.step) })}
            onInc={() => onChange({ fontSize: clampFontSize(settings.fontSize + FONT_SIZE_RANGE.step) })}
          />

          {/* Line height */}
          <Stepper
            label="Line spacing"
            value={settings.lineHeight.toFixed(1)}
            canDec={settings.lineHeight > LINE_HEIGHT_RANGE.min}
            canInc={settings.lineHeight < LINE_HEIGHT_RANGE.max}
            onDec={() => onChange({ lineHeight: clampLineHeight(settings.lineHeight - LINE_HEIGHT_RANGE.step) })}
            onInc={() => onChange({ lineHeight: clampLineHeight(settings.lineHeight + LINE_HEIGHT_RANGE.step) })}
          />

          {/* Font family */}
          <Text style={styles.sectionTitle}>Font</Text>
          <View style={styles.chipRow}>
            {FONT_FAMILIES.map((font) => {
              const active = settings.fontFamily === font.value;
              return (
                <Pressable
                  key={font.label}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => onChange({ fontFamily: font.value })}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{font.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Flow */}
          <Text style={styles.sectionTitle}>Layout</Text>
          <View style={styles.chipRow}>
            {(['paginated', 'scrolled'] as const).map((flow) => {
              const active = settings.flow === flow;
              return (
                <Pressable
                  key={flow}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => onChange({ flow })}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {flow === 'paginated' ? 'Paged' : 'Scrolled'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  body: { padding: 16, paddingBottom: 32, gap: 8 },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: Colors.text, fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepValue: { color: Colors.text, fontSize: 15, fontWeight: '600', minWidth: 36, textAlign: 'center' },
  segment: { flexDirection: 'row', backgroundColor: Colors.border, borderRadius: 8, overflow: 'hidden' },
  segmentBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  segmentBtnActive: { backgroundColor: Colors.accent },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: Colors.accent },
  swatchText: { fontSize: 16, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: Colors.border, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  chipActive: { backgroundColor: Colors.accent },
  chipText: { color: Colors.text, fontSize: 14 },
  chipTextActive: { color: Colors.bg, fontWeight: '600' },
});
