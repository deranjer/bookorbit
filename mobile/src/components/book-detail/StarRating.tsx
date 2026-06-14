import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';

interface Props {
  // Current rating, 1–5, or null when unrated.
  value: number | null;
  // Omit to render a read-only display (no press handling).
  onChange?: (rating: number | null) => void;
  size?: number;
  disabled?: boolean;
}

const STARS = [1, 2, 3, 4, 5];

export function StarRating({ value, onChange, size = 30, disabled = false }: Props) {
  const readOnly = onChange == null || disabled;

  function handlePress(star: number) {
    if (readOnly || !onChange) return;
    // Tapping the only filled star clears the rating.
    onChange(value === star ? null : star);
  }

  return (
    <View style={styles.row}>
      {STARS.map((star) => {
        const filled = value != null && star <= value;
        const inner = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? Colors.warning : Colors.textMuted}
          />
        );
        if (readOnly) {
          return (
            <View key={star} style={styles.star}>
              {inner}
            </View>
          );
        }
        return (
          <Pressable
            key={star}
            onPress={() => handlePress(star)}
            hitSlop={4}
            style={({ pressed }) => [styles.star, pressed && styles.starPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} star${star === 1 ? '' : 's'}`}
          >
            {inner}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  star: { padding: 2 },
  starPressed: { opacity: 0.6 },
});
