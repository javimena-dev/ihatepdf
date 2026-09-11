'use client';

import { useEffect, useMemo } from 'react';
import { FileMinus, FilePlus2, ImagePlus, Trash2 } from 'lucide-react';
import { Dropzone } from '@/components/ui/Dropzone';
import { usePdfStore, type EditorMode } from '@/store/usePdfStore';

interface SidebarProps {
  mode: EditorMode;
  selectedPageIndex: number;
  onMessage: (message: string, tone?: 'error' | 'info') => void;
  onAddFiles?: (files: File[]) => Promise<void>;
  busy?: boolean;
}

function createId() {
  return crypto.randomUUID();
}

export function Sidebar({ mode, selectedPageIndex, onMessage, onAddFiles, busy = false }: SidebarProps) {
  const files = usePdfStore((state) => state.files);
  const activeFileId = usePdfStore((state) => state.activeFileId);
  const pagesToDelete = usePdfStore((state) => state.pagesToDelete);
  const insertedImages = usePdfStore((state) => state.insertedImages);
  const addImage = usePdfStore((state) => state.addImage);
  const removeFile = usePdfStore((state) => state.removeFile);
  const setActiveFile = usePdfStore((state) => state.setActiveFile);
  const clearModeState = usePdfStore((state) => state.clearModeState);
  const rangeText = usePdfStore((state) => state.rangeText);
  const setRangeText = usePdfStore((state) => state.setRangeText);
  const activeFile = files.find((file) => file.id === activeFileId) ?? files[0] ?? null;
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  useEffect(() => {
    if (activeFile) {
      setRangeText(`1-${activeFile.pageCount}`);
    }
  }, [activeFile?.id, activeFile?.pageCount, setRangeText]);

  async function handlePdfFiles(nextFiles: File[]) {
    await onAddFiles?.(nextFiles);
  }

  function handleImages(images: File[]) {
    if (!activeFile) {
      onMessage('Carga un PDF antes de insertar imagenes.', 'error');
      return;
    }

    for (const image of images) {
      addImage({
        id: createId(),
        fileId: activeFile.id,
        pageIndex: selectedPageIndex,
        imageFile: image,
        htmlCoords: { x: 40, y: 40, width: 160, height: 100 },
        htmlPageDimensions: { width: 560, height: 792 },
      });
    }
    onMessage(`${images.length} imagen${images.length === 1 ? '' : 'es'} agregada${images.length === 1 ? '' : 's'}.`, 'info');
  }

  return (
    <aside className="flex h-full w-full flex-col bg-white lg:border-l lg:border-gray-200">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-normal text-gray-500">Opciones</h2>
        <p className="mt-1 text-lg font-semibold text-gray-950">
          {mode === 'merge' ? 'Unir PDFs' : mode === 'split' ? 'Dividir PDF' : 'Editar PDF'}
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-auto p-4">
        <Dropzone
          mode="pdf"
          currentFileCount={files.length}
          currentBytes={totalBytes}
          multiple={mode === 'merge'}
          label={mode === 'merge' ? 'Cargar PDFs' : 'Cargar PDF'}
          help="Maximo recomendado: 5 archivos o 100MB."
          onFiles={handlePdfFiles}
          onError={(message) => onMessage(message, 'error')}
        />

        {files.length ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-950">Archivos</h3>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded text-gray-500 hover:bg-gray-100"
                title="Descartar todo"
                onClick={clearModeState}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`rounded border p-3 text-sm ${
                    file.id === activeFileId ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <button type="button" className="block w-full text-left" onClick={() => setActiveFile(file.id)}>
                    <span className="block truncate font-medium text-gray-950">{file.name}</span>
                    <span className="mt-1 block text-xs text-gray-500">
                      {file.pageCount} paginas - {(file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                  </button>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-950"
                    onClick={() => removeFile(file.id)}
                  >
                    <FileMinus size={14} /> Quitar
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {mode === 'split' && activeFile ? (
          <section>
            <label htmlFor="range" className="text-sm font-medium text-gray-950">
              Rango de paginas
            </label>
            <input
              id="range"
              value={rangeText}
              onChange={(event) => setRangeText(event.target.value)}
              placeholder="1-3,5,8"
              className="mt-2 h-10 w-full rounded border border-gray-300 px-3 text-sm outline-none focus:border-orange-400"
            />
          </section>
        ) : null}

        {mode === 'edit' && activeFile ? (
          <section className="space-y-3">
            <Dropzone
              mode="image"
              multiple
              label="Insertar imagen"
              help="PNG o JPG. Se agrega a la pagina seleccionada."
              onFiles={handleImages}
              onError={(message) => onMessage(message, 'error')}
            />
            <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <ImagePlus size={16} /> {insertedImages.filter((img) => !img.fileId || img.fileId === activeFile.id).length} imagenes insertadas
              </p>
              <p className="mt-2 flex items-center gap-2">
                <Trash2 size={16} /> {Array.from(pagesToDelete).filter((key) => key.startsWith(`${activeFile.id}:`)).length} paginas marcadas
              </p>
            </div>
          </section>
        ) : null}
      </div>

      <div className="border-t border-gray-200 p-4">
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <FilePlus2 size={14} /> Todo se procesa localmente en tu navegador.
        </p>
      </div>
    </aside>
  );
}
