import { api } from './client';
import type { FileProgress, SaveFileProgress } from './types';

export async function getFileProgress(fileId: number): Promise<FileProgress | null> {
  const { data } = await api.get<FileProgress | null>(`/books/files/${fileId}/progress`);
  return data ?? null;
}

export async function saveFileProgress(fileId: number, body: SaveFileProgress): Promise<void> {
  await api.post(`/books/files/${fileId}/progress`, body);
}
