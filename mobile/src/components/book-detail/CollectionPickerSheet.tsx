import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addBookToCollection, getCollectionsForBook, removeBookFromCollection } from '@/src/api/collections';
import { Colors } from '@/src/constants/colors';

interface Props {
  visible: boolean;
  bookId: number;
  onClose: () => void;
}

export function CollectionPickerSheet({ visible, bookId, onClose }: Props) {
  const queryClient = useQueryClient();

  const { data: collections, isLoading } = useQuery({
    queryKey: ['book-collections', bookId],
    queryFn: () => getCollectionsForBook(bookId),
    enabled: visible && Number.isFinite(bookId),
  });

  const toggle = useMutation({
    mutationFn: ({ collectionId, isMember }: { collectionId: number; isMember: boolean }) =>
      isMember ? removeBookFromCollection(collectionId, bookId) : addBookToCollection(collectionId, bookId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['book-collections', bookId] });
      void queryClient.invalidateQueries({ queryKey: ['book', bookId] });
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add to Collection</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.accent} />
            </View>
          ) : !collections || collections.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No collections yet.</Text>
              <Text style={styles.emptyHint}>Create one from the Collections tab.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body}>
              {collections.map((collection) => {
                const isMember = collection.memberCount > 0;
                const pending = toggle.isPending && toggle.variables?.collectionId === collection.id;
                return (
                  <Pressable
                    key={collection.id}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    disabled={pending}
                    onPress={() => toggle.mutate({ collectionId: collection.id, isMember })}
                  >
                    <Ionicons name="albums-outline" size={20} color={Colors.textSecondary} style={styles.rowIcon} />
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {collection.name}
                    </Text>
                    {pending ? (
                      <ActivityIndicator size="small" color={Colors.accent} />
                    ) : (
                      <Ionicons
                        name={isMember ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isMember ? Colors.success : Colors.textMuted}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '80%',
    minHeight: 180,
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
  centered: { padding: 32, alignItems: 'center', gap: 6 },
  emptyText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  emptyHint: { color: Colors.textMuted, fontSize: 13 },
  body: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: Colors.surface },
  rowIcon: { width: 28 },
  rowLabel: { flex: 1, color: Colors.text, fontSize: 16, marginRight: 12 },
});
