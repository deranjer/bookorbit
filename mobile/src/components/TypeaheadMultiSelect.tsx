import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/src/constants/colors';

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

interface Props {
  label: string;
  placeholder: string;
  selected: string[];
  onChange: (next: string[]) => void;
  // Distinct cache namespace so author/genre/tag/language queries don't collide.
  queryKey: string;
  search: (q: string) => Promise<string[]>;
}

const MAX_SUGGESTIONS = 8;

export function TypeaheadMultiSelect({ label, placeholder, selected, onChange, queryKey, search }: Props) {
  const [text, setText] = useState('');
  const debounced = useDebounce(text.trim(), 300);

  const { data } = useQuery({
    queryKey: ['catalog', queryKey, debounced],
    queryFn: () => search(debounced),
    enabled: debounced.length > 1,
  });

  const suggestions = (data ?? []).filter((name) => !selected.includes(name)).slice(0, MAX_SUGGESTIONS);

  function add(name: string) {
    if (!selected.includes(name)) onChange([...selected, name]);
    setText('');
  }

  function remove(name: string) {
    onChange(selected.filter((s) => s !== name));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {selected.length > 0 && (
        <View style={styles.chips}>
          {selected.map((name) => (
            <Pressable key={name} style={styles.chip} onPress={() => remove(name)}>
              <Text style={styles.chipText} numberOfLines={1}>
                {name}
              </Text>
              <Ionicons name="close" size={14} color={Colors.accent} />
            </Pressable>
          ))}
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((name) => (
            <Pressable key={name} style={styles.suggestion} onPress={() => add(name)}>
              <Text style={styles.suggestionText} numberOfLines={1}>
                {name}
              </Text>
              <Ionicons name="add" size={16} color={Colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { color: Colors.accent, fontSize: 13, fontWeight: '500', flexShrink: 1 },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.text,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  suggestionText: { color: Colors.text, fontSize: 14, flexShrink: 1 },
});
