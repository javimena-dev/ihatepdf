'use client';

/* Previews use in-memory Object URLs, unavailable to next/image optimization. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileImage,
  GripVertical,
  LoaderCircle,
  Trash2,
} from 'lucide-react';
import { Dropzone } from '@/components/ui/Dropzone';
import {
  imagesToPdf,
  type ImageToPdfMargin,
  type ImageToPdfOptions,
  type ImageToPdfProgress,
} from '@/lib/imagesToPdf';

const MAX_IMAGES = 100;
const MAX_BYTES = 100 * 1024 * 1024;

interface ImageToPdfItem {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

const defaultOptions: ImageToPdfOptions = {
  pageSize: 'a4',
  orientation: 'auto',
  marginMm: 10,
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function loadImageItem(file: File): Promise<ImageToPdfItem> {
  const previewUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      resolve({
        id: crypto.randomUUID(),
        file,
        previewUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error(`No se pudo leer "${file.name}".`));
    };
    image.src = previewUrl;
  });
}

function downloadPdf(bytes: Uint8Array) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'imagenes.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function ImageToPdfPage() {
  const [items, setItems] = useState<ImageToPdfItem[]>([]);
  const itemsRef = useRef<ImageToPdfItem[]>([]);
  const [options, setOptions] = useState<ImageToPdfOptions>(defaultOptions);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [progress, setProgress] = useState<ImageToPdfProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  itemsRef.current = items;
  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);

  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    },
    [],
  );

  async function addImages(files: File[]) {
    setLoadingImages(true);
    setError(null);
    setNotice(null);

    try {
      const results = await Promise.allSettled(files.map(loadImageItem));
      const failed = results.filter((result) => result.status === 'rejected');
      const loaded = results
        .filter((result): result is PromiseFulfilledResult<ImageToPdfItem> => result.status === 'fulfilled')
        .map((result) => result.value);

      if (failed.length) {
        loaded.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        const message = failed[0].reason instanceof Error ? failed[0].reason.message : 'No se pudieron leer imagenes.';
        setError(message);
        return;
      }

      setItems((current) => [...current, ...loaded]);
      setNotice(`${loaded.length} imagen${loaded.length === 1 ? '' : 'es'} agregada${loaded.length === 1 ? '' : 's'}.`);
    } finally {
      setLoadingImages(false);
    }
  }

  function removeItem(id: string) {
    setItems((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
    setNotice(null);
  }

  function clearItems() {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setError(null);
    setNotice(null);
    setProgress(null);
  }

  function reorder(sourceId: string, targetId: string) {
    setItems((current) => {
      const sourceIndex = current.findIndex((item) => item.id === sourceId);
      const targetIndex = current.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function createPdf() {
    if (!items.length) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setProgress(null);

    try {
      const bytes = await imagesToPdf(
        items.map((item) => item.file),
        options,
        setProgress,
      );
      downloadPdf(bytes);
      setNotice(`PDF creado con ${items.length} pagina${items.length === 1 ? '' : 's'}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear PDF.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-red-600"><FileImage size={18} /> Herramienta PDF</p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950">Convertir imágenes a PDF</h1>
          <p className="mt-3 text-gray-600">Ordena tus imágenes y crea un PDF. Todo ocurre en tu navegador.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-gray-950">Selecciona imágenes</h2>
                  <p className="mt-1 text-sm text-gray-500">PNG o JPG. Máximo 100 imágenes y 100MB.</p>
                </div>
                {items.length ? (
                  <button type="button" onClick={clearItems} disabled={busy || loadingImages} className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                    <Trash2 size={16} /> Limpiar
                  </button>
                ) : null}
              </div>

              <div className="mt-5">
                <Dropzone
                  mode="image"
                  currentFileCount={items.length}
                  currentBytes={totalBytes}
                  maxFiles={MAX_IMAGES}
                  maxBytes={MAX_BYTES}
                  limitPolicy="reject"
                  disabled={busy || loadingImages}
                  multiple
                  label={items.length ? 'Añadir más imágenes' : 'Seleccionar imágenes'}
                  help="O arrastra archivos aquí. La selección conserva su orden."
                  onFiles={addImages}
                  onError={(message) => {
                    setError(message);
                    setNotice(null);
                  }}
                />
              </div>

              {loadingImages ? <p className="mt-4 flex items-center gap-2 text-sm text-gray-600"><LoaderCircle className="animate-spin" size={16} /> Leyendo imágenes...</p> : null}
              {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
              {notice ? <p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</p> : null}
            </section>

            {items.length ? (
              <section aria-labelledby="image-list-title">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 id="image-list-title" className="text-xl font-semibold text-gray-950">Páginas</h2>
                    <p className="mt-1 text-sm text-gray-500">Arrastra o usa flechas para cambiar orden.</p>
                  </div>
                  <p className="shrink-0 text-sm text-gray-500">{items.length} / {MAX_IMAGES}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item, index) => (
                    <article
                      key={item.id}
                      draggable={!busy}
                      onDragStart={() => setDraggedId(item.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggedId) reorder(draggedId, item.id);
                        setDraggedId(null);
                      }}
                      onDragEnd={() => setDraggedId(null)}
                      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${draggedId === item.id ? 'border-dashed border-red-300 opacity-60' : 'border-gray-200'}`}
                    >
                      <div className="relative grid aspect-[4/3] place-items-center bg-gray-100 p-3">
                        <span className="absolute left-3 top-3 grid h-7 min-w-7 place-items-center rounded-full bg-gray-950/80 px-2 text-xs font-medium text-white">{index + 1}</span>
                        <img src={item.previewUrl} alt={`Vista previa de ${item.file.name}`} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <GripVertical className="mt-0.5 shrink-0 cursor-grab text-gray-400" size={18} aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-medium text-gray-950" title={item.file.name}>{item.file.name}</h3>
                            <p className="mt-1 text-xs text-gray-500">{item.width} × {item.height} · {formatBytes(item.file.size)}</p>
                          </div>
                          <button type="button" onClick={() => removeItem(item.id)} disabled={busy} title={`Eliminar ${item.file.name}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 size={16} /></button>
                        </div>
                        <div className="mt-3 flex justify-end gap-1 border-t border-gray-100 pt-3">
                          <button type="button" onClick={() => moveItem(index, -1)} disabled={busy || index === 0} title="Mover antes" className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowUp size={16} /></button>
                          <button type="button" onClick={() => moveItem(index, 1)} disabled={busy || index === items.length - 1} title="Mover después" className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowDown size={16} /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="font-semibold text-gray-950">Opciones de página</h2>
            <div className="mt-5 space-y-5">
              <label className="block text-sm font-medium text-gray-700">
                Tamaño
                <select
                  value={options.pageSize}
                  disabled={busy}
                  onChange={(event) => setOptions((current) => ({ ...current, pageSize: event.target.value as ImageToPdfOptions['pageSize'] }))}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                >
                  <option value="a4">A4</option>
                  <option value="letter">Carta (8.5 × 11 in)</option>
                  <option value="image">Ajustar a imagen</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Orientación
                <select
                  value={options.orientation}
                  disabled={busy || options.pageSize === 'image'}
                  onChange={(event) => setOptions((current) => ({ ...current, orientation: event.target.value as ImageToPdfOptions['orientation'] }))}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="auto">Automática</option>
                  <option value="portrait">Vertical</option>
                  <option value="landscape">Horizontal</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Margen
                <select
                  value={options.marginMm}
                  disabled={busy || options.pageSize === 'image'}
                  onChange={(event) => setOptions((current) => ({ ...current, marginMm: Number(event.target.value) as ImageToPdfMargin }))}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value={0}>Sin margen</option>
                  <option value={10}>10 mm</option>
                  <option value={20}>20 mm</option>
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600">
              A4 y Carta respetan orientación y margen. Imágenes completas, centradas y sin recorte.
            </div>

            {busy && progress ? (
              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800" role="status">
                <p className="flex items-center gap-2 font-medium"><LoaderCircle className="animate-spin" size={16} /> Procesando {progress.current} de {progress.total}</p>
                <p className="mt-1 truncate text-xs text-blue-700">{progress.filename}</p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={createPdf}
              disabled={!items.length || busy || loadingImages}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />}
              {busy ? 'Creando PDF...' : 'Crear y descargar PDF'}
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">{items.length ? `${items.length} pagina${items.length === 1 ? '' : 's'} · ${formatBytes(totalBytes)}` : 'Agrega imágenes para continuar.'}</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
