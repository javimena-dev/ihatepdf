'use client';

/* Object URLs are created from in-memory user files and cannot use next/image optimization. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { Download, FileImage, Images, LoaderCircle, Trash2 } from 'lucide-react';
import { Dropzone } from '@/components/ui/Dropzone';
import {
  downloadImagesZip,
  extractImagesFromPdf,
  type ExtractedPdfImage,
  type ImageExtractionProgress,
} from '@/lib/extractPdfImages';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function archiveBaseName(name: string) {
  return name.replace(/\.pdf$/i, '') || 'imagenes';
}

export default function ExtractImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ExtractedPdfImage[]>([]);
  const [progress, setProgress] = useState<ImageExtractionProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const previews = useMemo(() => images.map((image) => ({ id: image.id, url: URL.createObjectURL(image.blob) })), [images]);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  async function handleFile(files: File[]) {
    const next = files[0];
    if (!next) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setProgress(null);
    setImages([]);
    setFile(next);
    try {
      const result = await extractImagesFromPdf(next, setProgress);
      setImages(result.images);
      setNotice(
        `${result.images.length} imagen${result.images.length === 1 ? '' : 'es'} unica${result.images.length === 1 ? '' : 's'} encontrada${result.images.length === 1 ? '' : 's'} en ${result.pages} pagina${result.pages === 1 ? '' : 's'}${result.skippedImages ? `. ${result.skippedImages} no se pudo convertir.` : '.'}`,
      );
    } catch (cause) {
      setFile(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo procesar PDF.');
    } finally {
      setBusy(false);
    }
  }

  function downloadImage(image: ExtractedPdfImage) {
    const url = URL.createObjectURL(image.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = image.filename;
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadAll() {
    if (!file || !images.length) return;
    setDownloading(true);
    try {
      await downloadImagesZip(images, archiveBaseName(file.name));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear ZIP.');
    } finally {
      setDownloading(false);
    }
  }

  function clear() {
    setFile(null);
    setImages([]);
    setProgress(null);
    setError(null);
    setNotice(null);
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-red-600"><Images size={18} /> Herramienta PDF</p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950">Extraer imágenes de PDF</h1>
          <p className="mt-3 text-gray-600">Encuentra imágenes incrustadas, revísalas y descárgalas. PDF nunca sale de navegador.</p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-950">Selecciona PDF</h2>
              <p className="mt-1 text-sm text-gray-500">Máximo 100MB, 500 páginas. Imágenes convertidas a PNG.</p>
            </div>
            {file ? (
              <button type="button" onClick={clear} disabled={busy} className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                <Trash2 size={16} /> Limpiar
              </button>
            ) : null}
          </div>

          {!file || error ? (
            <div className="mt-5 max-w-xl">
              <Dropzone mode="pdf" multiple={false} label="Seleccionar PDF" help="O arrastra archivo aquí. Procesamiento local." onFiles={handleFile} onError={setError} />
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-600"><FileImage size={20} /></span>
              <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-950">{file.name}</p><p className="mt-1 text-xs text-gray-500">{formatBytes(file.size)}</p></div>
            </div>
          )}

          {busy && progress ? (
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="flex items-center gap-2 font-medium"><LoaderCircle className="animate-spin" size={16} /> Procesando página {progress.currentPage} de {progress.totalPages}</p>
              <p className="mt-1 text-blue-700">{progress.imagesFound} imágenes únicas encontradas.</p>
            </div>
          ) : busy ? <p className="mt-5 text-sm text-gray-600">Leyendo PDF...</p> : null}
          {error ? <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {notice ? <p className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</p> : null}
        </section>

        {images.length ? (
          <section className="mt-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-xl font-semibold text-gray-950">Imágenes extraídas</h2><p className="mt-1 text-sm text-gray-500">{images.length} PNG listos para descargar.</p></div>
              <button type="button" onClick={downloadAll} disabled={downloading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
                {downloading ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />} {downloading ? 'Creando ZIP...' : 'Descargar todo'}
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => {
                const preview = previews.find((item) => item.id === image.id);
                return (
                  <article key={image.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="grid aspect-[4/3] place-items-center bg-gray-100 p-3"><img src={preview?.url} alt={image.filename} className="max-h-full max-w-full object-contain" /></div>
                    <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-gray-950">{image.filename}</h3><p className="mt-1 text-xs text-gray-500">{image.width} × {image.height} · {formatBytes(image.size)}</p><p className="mt-1 text-xs text-gray-500">Página{image.pages.length === 1 ? '' : 's'} {image.pages.join(', ')}</p></div><button type="button" title={`Descargar ${image.filename}`} onClick={() => downloadImage(image)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-600 hover:bg-gray-100"><Download size={17} /></button></div></div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
