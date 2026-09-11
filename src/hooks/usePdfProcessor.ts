'use client';

import { useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import type { ImageOverlay, LoadedPdf } from '@/store/usePdfStore';
import { convertHtmlToPdfCoords } from '@/utils/coordinates';

function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeRange(range: string, max: number) {
  const pages = new Set<number>();
  const parts = range
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startRaw, endRaw] = part.split('-');
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > max || start > end) {
        throw new Error(`Rango invalido: ${part}`);
      }
      for (let page = start; page <= end; page += 1) pages.add(page - 1);
    } else {
      const page = Number(part);
      if (!Number.isInteger(page) || page < 1 || page > max) throw new Error(`Pagina invalida: ${part}`);
      pages.add(page - 1);
    }
  }

  if (!pages.size) throw new Error('Ingresa al menos una pagina o rango.');
  return [...pages].sort((a, b) => a - b);
}

export function usePdfProcessor() {
  const mergePdfs = useCallback(async (files: LoadedPdf[], pagesToDelete: Set<string>) => {
    if (files.length < 2) throw new Error('Carga al menos dos PDFs para unir.');
    const merged = await PDFDocument.create();

    for (const file of files) {
      const src = await PDFDocument.load(file.bytes.slice(0));
      const indices = Array.from({ length: src.getPageCount() }, (_, index) => index).filter(
        (index) => !pagesToDelete.has(`${file.id}:${index}`)
      );
      if (!indices.length) continue;
      const pages = await merged.copyPages(src, indices);
      pages.forEach((page) => merged.addPage(page));
    }

    if (!merged.getPageCount()) throw new Error('No puedes eliminar todas las paginas de todos los archivos.');

    const bytes = await merged.save();
    downloadPdf(bytes, 'unido.pdf');
  }, []);

  const splitPdf = useCallback(async (file: LoadedPdf, rangeText: string, pagesToDelete: Set<string>) => {
    const src = await PDFDocument.load(file.bytes.slice(0));
    const pageIndices = normalizeRange(rangeText, src.getPageCount()).filter(
      (index) => !pagesToDelete.has(`${file.id}:${index}`)
    );

    if (!pageIndices.length) throw new Error('Todas las paginas del rango seleccionado estan eliminadas.');

    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, pageIndices);
    pages.forEach((page) => doc.addPage(page));

    const bytes = await doc.save();
    downloadPdf(bytes, 'dividido.pdf');
  }, []);

  const exportModifiedPdf = useCallback(
    async (file: LoadedPdf, pagesToDelete: Set<string>, insertedImages: ImageOverlay[]) => {
      const srcDoc = await PDFDocument.load(file.bytes.slice(0));
      const pdfDoc = await PDFDocument.create();
      const keep = Array.from({ length: srcDoc.getPageCount() }, (_, index) => index).filter(
        (index) => !pagesToDelete.has(`${file.id}:${index}`),
      );

      if (!keep.length) throw new Error('No puedes eliminar todas las paginas.');

      const copied = await pdfDoc.copyPages(srcDoc, keep);
      copied.forEach((page) => pdfDoc.addPage(page));

      const fileImages = insertedImages.filter((img) => !img.fileId || img.fileId === file.id);

      for (const item of fileImages) {
        const targetIndex = keep.indexOf(item.pageIndex);
        if (targetIndex < 0) continue;

        const page = pdfDoc.getPage(targetIndex);
        const { width: pdfW, height: pdfH } = page.getSize();
        const imageBytes = await item.imageFile.arrayBuffer();
        const embedded =
          item.imageFile.type === 'image/png'
            ? await pdfDoc.embedPng(imageBytes)
            : await pdfDoc.embedJpg(imageBytes);
        const coords = convertHtmlToPdfCoords(
          item.htmlCoords,
          item.htmlPageDimensions.width,
          item.htmlPageDimensions.height,
          pdfW,
          pdfH,
        );

        page.drawImage(embedded, coords);
      }

      const bytes = await pdfDoc.save();
      downloadPdf(bytes, 'editado.pdf');
    },
    [],
  );

  return { exportModifiedPdf, mergePdfs, splitPdf };
}
