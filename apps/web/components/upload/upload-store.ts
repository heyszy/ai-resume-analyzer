"use client";

import { create } from "zustand";

export type UploadStatus = "queued" | "uploading" | "success" | "error";

export type UploadItem = {
  id: string;
  signature: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  progress: number;
  errorMessage?: string;
  responseMessage?: string;
  candidateId?: string;
};

type UploadStoreState = {
  items: UploadItem[];
  addFiles: (files: File[]) => UploadItem[];
  updateItem: (id: string, patch: Partial<Omit<UploadItem, "id" | "file" | "signature">>) => void;
  removeItem: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
};

function createSignature(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function createUploadItem(file: File): UploadItem {
  return {
    id: crypto.randomUUID(),
    signature: createSignature(file),
    file,
    name: file.name,
    size: file.size,
    type: file.type || "application/pdf",
    status: "queued",
    progress: 0,
  };
}

export const useUploadStore = create<UploadStoreState>((set, get) => ({
  items: [],
  addFiles: (files) => {
    const existingSignatures = new Set(get().items.map((item) => item.signature));
    const nextItems = files
      .filter((file) => !existingSignatures.has(createSignature(file)))
      .map(createUploadItem);

    if (nextItems.length > 0) {
      set((state) => ({ items: [...state.items, ...nextItems] }));
    }

    return nextItems;
  },
  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      items: state.items.filter((item) => item.status !== "success"),
    })),
  clearAll: () => set({ items: [] }),
}));

export { createSignature };
