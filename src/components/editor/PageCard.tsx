'use client';

import { useEffect, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Document, Page } from 'react-pdf';
import '@/lib/pdfjs';
import { usePdfStore } from '@/store/usePdfStore';

interface PageCardProps {
  pageNumber: number;
  pdfBytes: ArrayBuffer;
  onSelect?: (pageIndex: number) => void;
  selected?: boolean;
  fileId: string;
  fileName?: string;
  overallIndex?: number;
}

export function PageCard({ pageNumber, pdfBytes, onSelect, selected = false, fileId, fileName, overallIndex }: PageCardProps) {
  const deleted = usePdfStore((state) => state.pagesToDelete.has(`${fileId}:${pageNumber - 1}`));
  const togglePageDelete = usePdfStore((state) => state.togglePageDelete);
  const [pdfFile, setPdfFile] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPdfFile(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfBytes]);

  return (
    <article
      className={`relative w-[190px] rounded-lg border bg-white p-3 ${
        selected ? 'border-blue-400' : deleted ? 'border-gray-300 opacity-50' : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        aria-label={`Seleccionar pagina ${pageNumber}`}
        onClick={() => onSelect?.(pageNumber - 1)}
        className="block min-h-[214px] w-full overflow-hidden rounded border border-gray-100 bg-gray-50"
      >
        {pdfFile ? (
          <Document file={pdfFile} loading={<div className="p-4 text-xs text-gray-500">Cargando...</div>}>
            <Page pageNumber={pageNumber} width={164} renderAnnotationLayer={false} renderTextLayer={false} />
          </Document>
        ) : (
          <div className="p-4 text-xs text-gray-500">Cargando...</div>
        )}
      </button>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="block text-sm font-medium text-gray-700">
            {overallIndex !== undefined ? `Pagina ${overallIndex}` : `Pagina ${pageNumber}`}
          </span>
          {fileName ? (
            <span className="block truncate text-xs text-gray-400 max-w-[110px]" title={fileName}>
              {fileName} (p. {pageNumber})
            </span>
          ) : null}
        </div>
        <button
          type="button"
          title={deleted ? 'Restaurar pagina' : 'Eliminar pagina'}
          onClick={() => togglePageDelete(fileId, pageNumber - 1)}
          className={`grid h-8 w-8 place-items-center rounded ${
            deleted ? 'bg-gray-950 text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {deleted ? <Check size={16} /> : <Trash2 size={16} />}
        </button>
      </div>
    </article>
  );
}
