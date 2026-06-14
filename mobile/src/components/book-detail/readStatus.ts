import type { Ionicons } from '@expo/vector-icons';
import type { ReadStatus } from '@/src/api/types';
import { Colors } from '@/src/constants/colors';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface ReadStatusMeta {
  value: ReadStatus;
  label: string;
  icon: IoniconName;
  color: string;
}

// Order and labels mirror the web client's STATUS_OPTIONS so the two stay in sync.
export const READ_STATUS_META: ReadStatusMeta[] = [
  { value: 'unread', label: 'Unread', icon: 'book-outline', color: Colors.textMuted },
  { value: 'want_to_read', label: 'Want to Read', icon: 'bookmark-outline', color: '#a78bfa' },
  { value: 'reading', label: 'Reading', icon: 'book', color: Colors.accent },
  { value: 'on_hold', label: 'On Hold', icon: 'pause-circle-outline', color: Colors.warning },
  { value: 'rereading', label: 'Re-reading', icon: 'refresh', color: '#e879f9' },
  { value: 'read', label: 'Read', icon: 'checkmark-circle', color: Colors.success },
  { value: 'skimmed', label: 'Skimmed', icon: 'scan-outline', color: '#22d3ee' },
  { value: 'abandoned', label: 'Abandoned', icon: 'close-circle-outline', color: Colors.error },
];

const META_BY_VALUE = new Map(READ_STATUS_META.map((m) => [m.value, m]));

export function readStatusMeta(status: ReadStatus): ReadStatusMeta {
  return META_BY_VALUE.get(status) ?? READ_STATUS_META[0];
}
