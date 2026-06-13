import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { searchAuthors, searchGenres, searchLanguages, searchTags } from '@/src/api/catalog';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  FILE_AVAILABILITY_OPTIONS,
  FORMAT_OPTIONS,
  READ_PROGRESS_OPTIONS,
  READ_STATUS_OPTIONS,
  SORT_OPTIONS,
  type LibraryFilters,
  type LibrarySort,
} from '@/src/features/library-filters/filterTypes';
import { TypeaheadMultiSelect } from './TypeaheadMultiSelect';

interface Props {
  visible: boolean;
  filters: LibraryFilters;
  sort: LibrarySort;
  onClose: () => void;
  onApply: (next: { filters: LibraryFilters; sort: LibrarySort }) => void;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export function FilterSortSheet({ visible, filters, sort, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<LibraryFilters>(filters);
  const [draftSort, setDraftSort] = useState<LibrarySort>(sort);

  // Re-seed the draft from the applied state each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setDraftSort(sort);
    }
  }, [visible, filters, sort]);

  function set<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleInArray<T>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  function selectSort(field: LibrarySort['field']) {
    if (field === draftSort.field) {
      setDraftSort({ field, dir: draftSort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setDraftSort({ field, dir: 'asc' });
    }
  }

  function parseYear(text: string): number | null {
    const n = parseInt(text, 10);
    return Number.isFinite(n) ? n : null;
  }

  function reset() {
    setDraft(DEFAULT_FILTERS);
    setDraftSort(DEFAULT_SORT);
  }

  function apply() {
    onApply({ filters: draft, sort: draftSort });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filter &amp; Sort</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            <Section title="Sort By">
              {SORT_OPTIONS.map((opt) => {
                const active = draftSort.field === opt.field;
                return (
                  <Pressable key={opt.field} style={styles.sortRow} onPress={() => selectSort(opt.field)}>
                    <Text style={[styles.sortLabel, active && styles.sortLabelActive]}>{opt.label}</Text>
                    {active && (
                      <Ionicons
                        name={draftSort.dir === 'asc' ? 'arrow-up' : 'arrow-down'}
                        size={18}
                        color={Colors.accent}
                      />
                    )}
                  </Pressable>
                );
              })}
            </Section>

            <Section title="Read Status">
              <View style={styles.chipWrap}>
                {READ_STATUS_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={draft.readStatus.includes(opt.value)}
                    onPress={() => set('readStatus', toggleInArray(draft.readStatus, opt.value))}
                  />
                ))}
              </View>
            </Section>

            <Section title="Reading Progress">
              <View style={styles.chipWrap}>
                {READ_PROGRESS_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={draft.readProgress === opt.value}
                    onPress={() => set('readProgress', draft.readProgress === opt.value ? null : opt.value)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Format">
              <View style={styles.chipWrap}>
                {FORMAT_OPTIONS.map((fmt) => (
                  <Chip
                    key={fmt}
                    label={fmt.toUpperCase()}
                    active={draft.formats.includes(fmt)}
                    onPress={() => set('formats', toggleInArray(draft.formats, fmt))}
                  />
                ))}
              </View>
            </Section>

            <Section title="File Availability">
              <View style={styles.chipWrap}>
                {FILE_AVAILABILITY_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={draft.fileAvailability === opt.value}
                    onPress={() => set('fileAvailability', draft.fileAvailability === opt.value ? null : opt.value)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Minimum Rating">
              <View style={styles.chipWrap}>
                {RATING_OPTIONS.map((n) => (
                  <Chip
                    key={n}
                    label={`${n}+`}
                    active={draft.minRating === n}
                    onPress={() => set('minRating', draft.minRating === n ? null : n)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Published Year">
              <View style={styles.yearRow}>
                <TextInput
                  style={styles.yearInput}
                  placeholder="From"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  value={draft.yearFrom != null ? String(draft.yearFrom) : ''}
                  onChangeText={(t) => set('yearFrom', parseYear(t))}
                />
                <Text style={styles.yearDash}>–</Text>
                <TextInput
                  style={styles.yearInput}
                  placeholder="To"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  value={draft.yearTo != null ? String(draft.yearTo) : ''}
                  onChangeText={(t) => set('yearTo', parseYear(t))}
                />
              </View>
            </Section>

            <Section title="Authors">
              <TypeaheadMultiSelect
                label="Authors"
                placeholder="Search authors…"
                selected={draft.authors}
                onChange={(v) => set('authors', v)}
                queryKey="authors"
                search={searchAuthors}
              />
            </Section>

            <Section title="Genres">
              <TypeaheadMultiSelect
                label="Genres"
                placeholder="Search genres…"
                selected={draft.genres}
                onChange={(v) => set('genres', v)}
                queryKey="genres"
                search={searchGenres}
              />
            </Section>

            <Section title="Tags">
              <TypeaheadMultiSelect
                label="Tags"
                placeholder="Search tags…"
                selected={draft.tags}
                onChange={(v) => set('tags', v)}
                queryKey="tags"
                search={searchTags}
              />
            </Section>

            <Section title="Languages">
              <TypeaheadMultiSelect
                label="Languages"
                placeholder="Search languages…"
                selected={draft.languages}
                onChange={(v) => set('languages', v)}
                queryKey="languages"
                search={searchLanguages}
              />
            </Section>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={[styles.footerBtn, styles.resetBtn]} onPress={reset}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
            <Pressable style={[styles.footerBtn, styles.applyBtn]} onPress={apply}>
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%',
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
  body: { flexGrow: 0 },
  bodyContent: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#ffffff' },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sortLabel: { color: Colors.text, fontSize: 15 },
  sortLabelActive: { color: Colors.accent, fontWeight: '600' },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  yearInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    color: Colors.text,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  yearDash: { color: Colors.textSecondary, fontSize: 16 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerBtn: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10 },
  resetBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  resetText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  applyBtn: { backgroundColor: Colors.accent },
  applyText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
