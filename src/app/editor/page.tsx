'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GripVertical, PanelsTopLeft, Trash2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { ImageCanvas } from '@/components/editor/ImageCanvas';
import { PageGrid } from '@/components/editor/PageGrid';
import { Sidebar } from '@/components/editor/Sidebar';
import { Dropzone } from '@/components/ui/Dropzone';
import { usePdfStore, type EditorMode } from '@/store/usePdfStore';

function isMode(value: string | null): value is EditorMode {
  return value === 'merge' || value === 'split' || value === 'edit';
}

export default function EditorPage({ searchParams }: { searchParams: { mode?: string } }) {
  const rawMode = searchParams.mode ?? null;
  const mode: EditorMode = isMode(rawMode) ? rawMode : 'edit';
  const files = usePdfStore((state) => state.files);
  const activeFileId = usePdfStore((state) => state.activeFileId);
  const clearModeState = usePdfStore((state) => state.clearModeState);
  const addFiles = usePdfStore((state) => state.addFiles);
  const removeFile = usePdfStore((state) => state.removeFile);
  const reorderFiles = usePdfStore((state) => state.reorderFiles);
  const setMode = usePdfStore((state) => state.setMode);
  const notify = usePdfStore((state) => state.notify);
  const message = usePdfStore((state) => state.message);
  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0] ?? null,
    [activeFileId, files],
  );
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const pageItems = useMemo(() => {
    if (mode === 'merge') {
      return files.flatMap((file) =>
        Array.from({ length: file.pageCount }, (_, i) => ({
          fileId: file.id,
          pageNumber: i + 1,
          pdfBytes: file.bytes,
          fileName: file.name,
        }))
      );
    }
    if (!activeFile) return [];
    return Array.from({ length: activeFile.pageCount }, (_, i) => ({
      fileId: activeFile.id,
      pageNumber: i + 1,
      pdfBytes: activeFile.bytes,
      fileName: activeFile.name,
    }));
  }, [files, activeFile, mode]);

  useEffect(() => {
    clearModeState();
    setMode(mode);
    return () => setMode(null);
  }, [clearModeState, setMode, mode]);

  useEffect(() => {
    setSelectedPageIndex(0);
  }, [activeFile?.id]);

  async function handlePdfFiles(nextFiles: File[]) {
    setBusy(true);
    try {
      const loaded = await Promise.all(
        nextFiles.map(async (file) => {
          const bytes = await file.arrayBuffer();
          const doc = await PDFDocument.load(bytes.slice(0));
          return {
            id: crypto.randomUUID(),
            name: file.name,
            bytes,
            pageCount: doc.getPageCount(),
            size: file.size,
          };
        })
      );
      addFiles(loaded);
      notify(`${loaded.length} PDF cargado${loaded.length === 1 ? '' : 's'}.`, 'info');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo leer el PDF.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    event.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderFiles(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">
      <div className="flex flex-col lg:grid lg:h-full lg:grid-cols-[250px_minmax(0,1fr)_340px]">
        {/* Panel izquierdo: Miniaturas */}
        <section className="flex flex-col border-b border-gray-200 bg-white min-h-0 lg:h-full lg:border-b-0 lg:border-r">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-4">
            <Link href="/" className="grid h-8 w-8 place-items-center rounded text-gray-600 hover:bg-gray-100" title="Volver">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-xs uppercase text-gray-500">Paginas</p>
              <p className="text-sm font-medium text-gray-950">
                {pageItems.length ? `${pageItems.length} en total` : 'Sin PDF'}
              </p>
            </div>
          </div>
          {pageItems.length ? (
            <div className="flex-1 overflow-hidden min-h-0 max-lg:h-[320px]">
              <PageGrid
                items={pageItems}
                selectedPageIndex={selectedPageIndex}
                onSelectPage={setSelectedPageIndex}
                showMergeLabels={mode === 'merge'}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm text-gray-500 max-lg:hidden">
              <PanelsTopLeft className="mb-3 text-gray-300" size={34} />
              Carga un PDF para ver sus miniaturas.
            </div>
          )}
        </section>

        {/* Panel central: Lienzo / Canvas */}
        <section className={`flex flex-col min-w-0 lg:h-full ${!activeFile ? 'max-lg:hidden' : 'max-lg:min-h-[500px]'}`}>
          {activeFile ? (
            mode === 'merge' ? (
              <div className="flex h-full w-full flex-col overflow-auto bg-gray-50 p-6 sm:p-10">
                <div className="mb-6 max-w-2xl">
                  <h1 className="text-2xl font-semibold text-gray-950">Unir archivos PDF</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Arrastra las tarjetas para ordenar los archivos. Revisa las miniaturas en el panel izquierdo y pulsa en Unir y descargar arriba.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {files.map((file, index) => (
                    <div
                      key={file.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={`relative flex flex-col justify-between rounded-xl border p-5 transition cursor-grab active:cursor-grabbing ${
                        dragOverIndex === index
                          ? 'border-red-400 bg-red-50/50 shadow-md ring-2 ring-red-400/20'
                          : draggedIndex === index
                          ? 'border-dashed border-gray-300 bg-gray-100 opacity-60'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="text-gray-400 cursor-grab active:cursor-grabbing" size={20} />
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-sm font-semibold text-red-600">
                              {index + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Quitar archivo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="mt-4 truncate text-base font-medium text-gray-900" title={file.name}>
                          {file.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {file.pageCount} paginas • {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col justify-center">
                    <Dropzone
                      mode="pdf"
                      currentFileCount={files.length}
                      currentBytes={files.reduce((sum, f) => sum + f.size, 0)}
                      multiple
                      label="Añadir mas PDFs"
                      help="Selecciona o arrastra mas archivos"
                      onFiles={handlePdfFiles}
                      onError={(msg) => notify(msg, 'error')}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <ImageCanvas pageIndex={Math.min(selectedPageIndex, activeFile.pageCount - 1)} pdfBytes={activeFile.bytes} />
              </div>
            )
          ) : (
            <div className="flex h-full flex-1 items-center justify-center bg-gray-50 p-6 sm:p-12">
              <div className="w-full max-w-lg text-center">
                <PanelsTopLeft className="mx-auto mb-6 text-gray-400" size={56} />
                <h1 className="text-2xl font-semibold text-gray-950">
                  {mode === 'merge' ? 'Unir archivos PDF' : mode === 'split' ? 'Dividir archivo PDF' : 'Editar archivo PDF'}
                </h1>
                <p className="mb-8 mt-2 text-sm leading-6 text-gray-600">
                  {mode === 'merge'
                    ? 'Selecciona o arrastra varios archivos PDF para combinarlos en un solo documento.'
                    : mode === 'split'
                    ? 'Selecciona un archivo PDF para extraer paginas o rangos especificos.'
                    : 'Selecciona un archivo PDF para eliminar paginas o insertar imagenes.'}
                </p>
                <Dropzone
                  mode="pdf"
                  currentFileCount={files.length}
                  currentBytes={files.reduce((sum, f) => sum + f.size, 0)}
                  multiple={mode === 'merge'}
                  label={mode === 'merge' ? 'Seleccionar archivos PDF' : 'Seleccionar archivo PDF'}
                  help="O arrastra y suelta aqui. Todo se procesa en tu navegador."
                  onFiles={handlePdfFiles}
                  onError={(msg) => notify(msg, 'error')}
                />
              </div>
            </div>
          )}

          {message ? (
            <div
              className={`fixed bottom-5 left-1/2 z-20 -translate-x-1/2 rounded border px-4 py-3 text-sm ${
                message.tone === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              {message.text}
            </div>
          ) : null}
        </section>

        {/* Panel derecho: Sidebar / Controles */}
        <section className="flex flex-col border-t border-gray-200 lg:h-full lg:w-[340px] lg:border-t-0">
          <Sidebar mode={mode} selectedPageIndex={selectedPageIndex} onMessage={notify} onAddFiles={handlePdfFiles} busy={busy} />
        </section>
      </div>
    </main>
  );
}
