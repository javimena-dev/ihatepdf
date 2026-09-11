'use client';

import { create } from 'zustand';

export interface LoadedPdf {
  id: string;
  name: string;
  bytes: ArrayBuffer;
  pageCount: number;
  size: number;
}

export interface HtmlCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageOverlay {
  id: string;
  pageIndex: number;
  imageFile: File;
  htmlCoords: HtmlCoords;
  htmlPageDimensions: { width: number; height: number };
  fileId?: string;
}

export type EditorMode = 'merge' | 'split' | 'edit';

export interface ToastMessage {
  text: string;
  tone: 'error' | 'info';
}

interface PdfStore {
  files: LoadedPdf[];
  pagesToDelete: Set<string>;
  insertedImages: ImageOverlay[];
  activeFileId: string | null;
  mode: EditorMode | null;
  rangeText: string;
  exportBusy: boolean;
  message: ToastMessage | null;
  setMode: (mode: EditorMode | null) => void;
  setRangeText: (rangeText: string) => void;
  setExportBusy: (busy: boolean) => void;
  notify: (text: string, tone?: 'error' | 'info') => void;
  clearMessage: () => void;
  addFiles: (files: LoadedPdf[]) => void;
  removeFile: (id: string) => void;
  reorderFiles: (startIndex: number, endIndex: number) => void;
  setActiveFile: (id: string | null) => void;
  togglePageDelete: (fileId: string, index: number) => void;
  addImage: (overlay: ImageOverlay) => void;
  updateImageCoords: (id: string, coords: HtmlCoords, pageDimensions?: ImageOverlay['htmlPageDimensions']) => void;
  clearModeState: () => void;
}

export const usePdfStore = create<PdfStore>((set) => ({
  files: [],
  pagesToDelete: new Set(),
  insertedImages: [],
  activeFileId: null,
  mode: null,
  rangeText: '1-1',
  exportBusy: false,
  message: null,
  setMode: (mode) => set({ mode }),
  setRangeText: (rangeText) => set({ rangeText }),
  setExportBusy: (exportBusy) => set({ exportBusy }),
  notify: (text, tone = 'info') => set({ message: { text, tone } }),
  clearMessage: () => set({ message: null }),
  addFiles: (files) =>
    set((state) => ({
      files: [...state.files, ...files],
      activeFileId: state.activeFileId ?? files[0]?.id ?? null,
    })),
  removeFile: (id) =>
    set((state) => {
      const files = state.files.filter((file) => file.id !== id);
      const pagesToDelete = new Set(state.pagesToDelete);
      pagesToDelete.forEach((key) => {
        if (key.startsWith(`${id}:`)) pagesToDelete.delete(key);
      });
      const insertedImages = state.insertedImages.filter((img) => img.fileId !== id);
      return {
        files,
        activeFileId: state.activeFileId === id ? files[0]?.id ?? null : state.activeFileId,
        pagesToDelete,
        insertedImages,
      };
    }),
  reorderFiles: (startIndex, endIndex) =>
    set((state) => {
      const next = [...state.files];
      const [moved] = next.splice(startIndex, 1);
      next.splice(endIndex, 0, moved);
      return { files: next };
    }),
  setActiveFile: (id) =>
    set(() => ({
      activeFileId: id,
    })),
  togglePageDelete: (fileId, index) =>
    set((state) => {
      const key = `${fileId}:${index}`;
      const next = new Set(state.pagesToDelete);
      next.has(key) ? next.delete(key) : next.add(key);
      return { pagesToDelete: next };
    }),
  addImage: (overlay) => set((state) => ({ insertedImages: [...state.insertedImages, overlay] })),
  updateImageCoords: (id, coords, pageDimensions) =>
    set((state) => ({
      insertedImages: state.insertedImages.map((image) =>
        image.id === id
          ? {
              ...image,
              htmlCoords: coords,
              htmlPageDimensions: pageDimensions ?? image.htmlPageDimensions,
            }
          : image,
      ),
    })),
  clearModeState: () =>
    set(() => ({
      files: [],
      pagesToDelete: new Set(),
      insertedImages: [],
      activeFileId: null,
      rangeText: '1-1',
      exportBusy: false,
    })),
}));
