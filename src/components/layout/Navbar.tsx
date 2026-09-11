'use client';

import Link from 'next/link';
import { Download, FileText, Merge, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePdfProcessor } from '@/hooks/usePdfProcessor';
import { usePdfStore } from '@/store/usePdfStore';

export function Navbar() {
  const mode = usePdfStore((state) => state.mode);
  const files = usePdfStore((state) => state.files);
  const activeFileId = usePdfStore((state) => state.activeFileId);
  const pagesToDelete = usePdfStore((state) => state.pagesToDelete);
  const insertedImages = usePdfStore((state) => state.insertedImages);
  const rangeText = usePdfStore((state) => state.rangeText);
  const exportBusy = usePdfStore((state) => state.exportBusy);
  const setExportBusy = usePdfStore((state) => state.setExportBusy);
  const notify = usePdfStore((state) => state.notify);
  const { exportModifiedPdf, mergePdfs, splitPdf } = usePdfProcessor();

  const activeFile = files.find((file) => file.id === activeFileId) ?? files[0] ?? null;

  async function runExport() {
    if (!activeFile && mode !== 'merge') {
      notify('Carga un PDF para continuar.', 'error');
      return;
    }

    setExportBusy(true);
    try {
      if (mode === 'merge') await mergePdfs(files, pagesToDelete);
      if (mode === 'split' && activeFile) await splitPdf(activeFile, rangeText, pagesToDelete);
      if (mode === 'edit' && activeFile) await exportModifiedPdf(activeFile, pagesToDelete, insertedImages);
      notify('PDF exportado correctamente.', 'info');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo exportar el PDF.', 'error');
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold text-gray-950">
          <span className="grid h-8 w-8 place-items-center rounded bg-red-500 text-white">
            <FileText size={18} />
          </span>
          IHatePDF
        </Link>
        {mode ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 max-sm:hidden">Privado en tu navegador</span>
            <Button
              disabled={exportBusy || (mode === 'merge' ? files.length < 2 : !activeFile)}
              onClick={runExport}
              icon={
                mode === 'merge' ? (
                  <Merge size={16} />
                ) : mode === 'split' ? (
                  <Scissors size={16} />
                ) : (
                  <Download size={16} />
                )
              }
            >
              {exportBusy
                ? 'Procesando...'
                : mode === 'merge'
                ? 'Unir y descargar'
                : mode === 'split'
                ? 'Dividir y descargar'
                : 'Exportar PDF'}
            </Button>
          </div>
        ) : (
          <span className="text-sm text-gray-500">Privado en tu navegador</span>
        )}
      </div>
    </header>
  );
}
