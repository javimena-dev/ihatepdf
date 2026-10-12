'use client';

import type { PDFPageProxy } from 'pdfjs-dist';
import { pdfjs } from '@/lib/pdfjs';

export const IMAGE_EXTRACTION_LIMITS = {
  maxFileBytes: 100 * 1024 * 1024,
  maxPages: 500,
  maxImages: 250,
  maxPixelsPerImage: 16 * 1024 * 1024,
  maxOutputBytes: 200 * 1024 * 1024,
} as const;

export interface ExtractedPdfImage {
  id: string;
  filename: string;
  pages: number[];
  width: number;
  height: number;
  size: number;
  blob: Blob;
}

export interface ImageExtractionProgress {
  currentPage: number;
  totalPages: number;
  imagesFound: number;
}

export interface ImageExtractionResult {
  images: ExtractedPdfImage[];
  skippedImages: number;
  pages: number;
}

interface PdfImageData {
  width: number;
  height: number;
  data?: Uint8Array | Uint8ClampedArray | null;
  bitmap?: ImageBitmap;
  ref?: unknown;
}

interface ImageCandidate {
  source: PdfImageData;
  page: number;
  fallbackId: string;
}

function asPdfImageData(value: unknown): PdfImageData | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<PdfImageData>;
  if (!Number.isFinite(source.width) || !Number.isFinite(source.height)) return null;
  return source as PdfImageData;
}

function refKey(ref: unknown) {
  if (typeof ref === 'string' || typeof ref === 'number') return String(ref);
  if (ref && typeof ref === 'object') {
    const value = ref as { num?: unknown; gen?: unknown; toString?: () => string };
    if (typeof value.num === 'number') return `${value.num}:${value.gen ?? 0}`;
    const text = value.toString?.();
    if (text && text !== '[object Object]') return text;
  }
  return null;
}

function imageObject(page: PDFPageProxy, id: string) {
  if (page.objs.has(id)) return Promise.resolve(page.objs.get(id) as unknown);
  return new Promise<unknown>((resolve) => page.objs.get(id, resolve));
}

async function imageCandidates(page: PDFPageProxy, pageNumber: number, operatorList: { fnArray: number[]; argsArray: unknown[][] }) {
  const candidates: ImageCandidate[] = [];
  const objectOperators = new Set<number>([
    pdfjs.OPS.paintImageXObject,
    pdfjs.OPS.paintImageXObjectRepeat,
  ]);

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const operator = operatorList.fnArray[index];
    const args = operatorList.argsArray[index] ?? [];
    if (objectOperators.has(operator) && typeof args[0] === 'string') {
      const source = asPdfImageData(await imageObject(page, args[0]));
      if (source) candidates.push({ source, page: pageNumber, fallbackId: args[0] });
    }

    if (operator === pdfjs.OPS.paintInlineImageXObject) {
      const source = asPdfImageData(args[0]);
      if (source) candidates.push({ source, page: pageNumber, fallbackId: `inline-${index}` });
    }
  }
  return candidates;
}

function rgbaPixels(source: PdfImageData) {
  const data = source.data;
  if (!data) throw new Error('PDF.js no devolvio datos de imagen.');
  const pixels = source.width * source.height;
  const rgba = new Uint8ClampedArray(pixels * 4);

  if (data.length === rgba.length) {
    rgba.set(data);
    return rgba;
  }

  if (data.length === pixels * 3) {
    for (let sourceIndex = 0, targetIndex = 0; sourceIndex < data.length; sourceIndex += 3, targetIndex += 4) {
      rgba[targetIndex] = data[sourceIndex];
      rgba[targetIndex + 1] = data[sourceIndex + 1];
      rgba[targetIndex + 2] = data[sourceIndex + 2];
      rgba[targetIndex + 3] = 255;
    }
    return rgba;
  }

  if (data.length === pixels) {
    for (let index = 0; index < pixels; index += 1) {
      const value = data[index];
      const targetIndex = index * 4;
      rgba[targetIndex] = value;
      rgba[targetIndex + 1] = value;
      rgba[targetIndex + 2] = value;
      rgba[targetIndex + 3] = 255;
    }
    return rgba;
  }

  throw new Error('Formato de imagen no compatible.');
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo convertir imagen a PNG.'))), 'image/png');
  });
}

async function pngBlob(source: PdfImageData) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Tu navegador no permite crear canvas.');

  if (source.bitmap) {
    context.drawImage(source.bitmap, 0, 0, source.width, source.height);
    source.bitmap.close();
  } else {
    context.putImageData(new ImageData(rgbaPixels(source), source.width, source.height), 0, 0);
  }

  return canvasToBlob(canvas);
}

async function blobDigest(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function releaseBitmap(source: PdfImageData) {
  source.bitmap?.close();
}

export async function extractImagesFromPdf(
  file: File,
  onProgress?: (progress: ImageExtractionProgress) => void,
): Promise<ImageExtractionResult> {
  if (file.type !== 'application/pdf') throw new Error('Selecciona un archivo PDF.');
  if (!file.size) throw new Error('Archivo PDF vacio.');
  if (file.size > IMAGE_EXTRACTION_LIMITS.maxFileBytes) throw new Error('PDF supera limite de 100MB.');

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    maxImageSize: IMAGE_EXTRACTION_LIMITS.maxPixelsPerImage,
    isEvalSupported: false,
    stopAtErrors: false,
  });
  loadingTask.onPassword = () => {
    void loadingTask.destroy();
  };

  try {
    const document = await loadingTask.promise;
    if (!document.numPages) throw new Error('PDF no contiene paginas.');
    if (document.numPages > IMAGE_EXTRACTION_LIMITS.maxPages) {
      throw new Error(`PDF supera limite de ${IMAGE_EXTRACTION_LIMITS.maxPages} paginas.`);
    }

    const extracted = new Map<string, ExtractedPdfImage>();
    let skippedImages = 0;
    let outputBytes = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const operatorList = await page.getOperatorList();
        const candidates = await imageCandidates(page, pageNumber, operatorList);

        for (const candidate of candidates) {
          const { source } = candidate;
          if (source.width * source.height > IMAGE_EXTRACTION_LIMITS.maxPixelsPerImage) {
            throw new Error('Una imagen supera limite de 16 megapixeles.');
          }

          const reference = refKey(source.ref);
          if (reference) {
            const existing = extracted.get(`ref:${reference}`);
            if (existing) {
              existing.pages = [...new Set([...existing.pages, candidate.page])];
              releaseBitmap(source);
              continue;
            }
          }

          try {
            const blob = await pngBlob(source);
            const id = reference ? `ref:${reference}` : `hash:${await blobDigest(blob)}`;
            const existing = extracted.get(id);
            if (existing) {
              existing.pages = [...new Set([...existing.pages, candidate.page])];
              continue;
            }
            if (extracted.size >= IMAGE_EXTRACTION_LIMITS.maxImages) {
              throw new Error(`PDF supera limite de ${IMAGE_EXTRACTION_LIMITS.maxImages} imagenes unicas.`);
            }
            outputBytes += blob.size;
            if (outputBytes > IMAGE_EXTRACTION_LIMITS.maxOutputBytes) {
              throw new Error('Imagenes extraidas superan limite de 200MB.');
            }
            const number = extracted.size + 1;
            extracted.set(id, {
              id: reference ?? candidate.fallbackId,
              filename: `image-${String(number).padStart(3, '0')}.png`,
              pages: [candidate.page],
              width: source.width,
              height: source.height,
              size: blob.size,
              blob,
            });
          } catch (error) {
            if (error instanceof Error && /limite/.test(error.message)) throw error;
            skippedImages += 1;
            releaseBitmap(source);
          }
        }
      } finally {
        page.cleanup();
      }
      onProgress?.({ currentPage: pageNumber, totalPages: document.numPages, imagesFound: extracted.size });
    }

    const images = [...extracted.values()];
    if (!images.length) {
      throw new Error(skippedImages ? 'No se pudieron convertir imagenes del PDF.' : 'No se encontraron imagenes en PDF.');
    }
    return { images, skippedImages, pages: document.numPages };
  } catch (error) {
    if (error instanceof Error && /password/i.test(error.message)) {
      throw new Error('PDF protegido con contraseña no compatible.');
    }
    throw error instanceof Error ? error : new Error('No se pudo procesar PDF.');
  } finally {
    await loadingTask.destroy();
  }
}

export async function downloadImagesZip(images: ExtractedPdfImage[], filename: string) {
  const { downloadZip } = await import('client-zip');
  const archive = await downloadZip(images.map((image) => ({ name: image.filename, input: image.blob }))).blob();
  const url = URL.createObjectURL(archive);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename || 'imagenes'}-imagenes.zip`;
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
