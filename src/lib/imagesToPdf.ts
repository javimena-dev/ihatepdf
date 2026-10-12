import { PDFDocument, rgb, type PDFImage } from 'pdf-lib';

export const A4_PORTRAIT = { width: 595.28, height: 841.89 } as const;
export const LETTER_PORTRAIT = { width: 612, height: 792 } as const;
const POINTS_PER_MM = 72 / 25.4;
const MAX_PAGE_POINTS = 14_400;

export type ImageToPdfPageSize = 'a4' | 'letter' | 'image';
export type ImageToPdfOrientation = 'auto' | 'portrait' | 'landscape';
export type ImageToPdfMargin = 0 | 10 | 20;

export interface ImageToPdfOptions {
  pageSize: ImageToPdfPageSize;
  orientation: ImageToPdfOrientation;
  marginMm: ImageToPdfMargin;
}

export interface ImageToPdfProgress {
  current: number;
  total: number;
  filename: string;
}

export interface ImagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getPageDimensions(
  imageWidth: number,
  imageHeight: number,
  options: ImageToPdfOptions,
) {
  if (options.pageSize === 'image') {
    const scale = Math.min(1, MAX_PAGE_POINTS / Math.max(imageWidth, imageHeight));
    return { width: imageWidth * scale, height: imageHeight * scale };
  }

  const landscape =
    options.orientation === 'landscape' ||
    (options.orientation === 'auto' && imageWidth > imageHeight);
  const portraitDimensions = options.pageSize === 'letter' ? LETTER_PORTRAIT : A4_PORTRAIT;

  return landscape
    ? { width: portraitDimensions.height, height: portraitDimensions.width }
    : { ...portraitDimensions };
}

export function calculateImagePlacement(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  marginMm: number,
): ImagePlacement {
  const margin = marginMm * POINTS_PER_MM;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  if (imageWidth <= 0 || imageHeight <= 0 || availableWidth <= 0 || availableHeight <= 0) {
    throw new Error('Dimensiones de imagen o pagina invalidas.');
  }

  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

async function embedImage(pdf: PDFDocument, file: File): Promise<PDFImage> {
  const bytes = await file.arrayBuffer();
  if (file.type === 'image/png') return pdf.embedPng(bytes);
  if (file.type === 'image/jpeg') return pdf.embedJpg(bytes);
  throw new Error(`Formato no compatible en "${file.name}".`);
}

export async function imagesToPdf(
  files: File[],
  options: ImageToPdfOptions,
  onProgress?: (progress: ImageToPdfProgress) => void,
): Promise<Uint8Array> {
  if (!files.length) throw new Error('Agrega al menos una imagen.');

  const pdf = await PDFDocument.create();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    onProgress?.({ current: index + 1, total: files.length, filename: file.name });

    try {
      const image = await embedImage(pdf, file);
      const pageDimensions = getPageDimensions(image.width, image.height, options);
      const page = pdf.addPage([pageDimensions.width, pageDimensions.height]);
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageDimensions.width,
        height: pageDimensions.height,
        color: rgb(1, 1, 1),
      });

      const marginMm = options.pageSize === 'image' ? 0 : options.marginMm;
      const placement = calculateImagePlacement(
        image.width,
        image.height,
        pageDimensions.width,
        pageDimensions.height,
        marginMm,
      );
      page.drawImage(image, placement);
    } catch (cause) {
      const detail = cause instanceof Error ? ` ${cause.message}` : '';
      throw new Error(`No se pudo procesar "${file.name}".${detail}`);
    }
  }

  return pdf.save();
}
