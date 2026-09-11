'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Document, Page } from 'react-pdf';
import '@/lib/pdfjs';
import { ImagePreview } from '@/components/editor/ImagePreview';
import { usePdfStore } from '@/store/usePdfStore';

const pageWidth = 560;

interface ImageCanvasProps {
  pageIndex: number;
  pdfBytes: ArrayBuffer;
}

export function ImageCanvas({ pageIndex, pdfBytes }: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const insertedImages = usePdfStore((state) => state.insertedImages);
  const updateImageCoords = usePdfStore((state) => state.updateImageCoords);
  const activeFileId = usePdfStore((state) => state.activeFileId);
  const [pageHeight, setPageHeight] = useState(792);
  const pageImages = useMemo(
    () => insertedImages.filter((image) => image.pageIndex === pageIndex && (!image.fileId || image.fileId === activeFileId)),
    [insertedImages, pageIndex, activeFileId],
  );
  const [pdfFile, setPdfFile] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPdfFile(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfBytes]);

  function dimensions() {
    const rect = containerRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? pageWidth, height: rect?.height ?? pageHeight };
  }

  return (
    <div className="flex h-full w-full items-start overflow-auto bg-gray-100 p-6 max-sm:p-2">
      <div
        ref={containerRef}
        className="relative mx-auto shrink-0 bg-white shadow-lg"
        style={{ width: pageWidth, height: pageHeight }}
      >
        {pdfFile ? (
          <Document file={pdfFile} loading={<div className="p-6 text-sm text-gray-500">Cargando PDF...</div>}>
            <Page
              pageNumber={pageIndex + 1}
              width={pageWidth}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              onRenderSuccess={(page) => {
                const viewport = page.getViewport({ scale: 1 });
                setPageHeight((viewport.height / viewport.width) * pageWidth);
              }}
            />
          </Document>
        ) : (
          <div className="p-6 text-sm text-gray-500">Cargando PDF...</div>
        )}

        {pageImages.map((image) => (
          <Rnd
            key={image.id}
            bounds="parent"
            size={{ width: image.htmlCoords.width, height: image.htmlCoords.height }}
            position={{ x: image.htmlCoords.x, y: image.htmlCoords.y }}
            onDragStop={(e, data) => {
              updateImageCoords(
                image.id,
                { ...image.htmlCoords, x: data.x, y: data.y },
                dimensions(),
              );
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              updateImageCoords(
                image.id,
                {
                  x: position.x,
                  y: position.y,
                  width: ref.offsetWidth,
                  height: ref.offsetHeight,
                },
                dimensions(),
              );
            }}
            className="absolute z-10 border border-dashed border-blue-500 bg-blue-50/20 hover:bg-blue-50/40"
          >
            <ImagePreview file={image.imageFile} />
          </Rnd>
        ))}
      </div>
    </div>
  );
}
