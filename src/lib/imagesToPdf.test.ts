import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  A4_PORTRAIT,
  LETTER_PORTRAIT,
  calculateImagePlacement,
  getPageDimensions,
  imagesToPdf,
  type ImageToPdfOptions,
} from './imagesToPdf';

const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const jpegBase64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==';

const a4Options: ImageToPdfOptions = {
  pageSize: 'a4',
  orientation: 'auto',
  marginMm: 10,
};

const letterOptions: ImageToPdfOptions = {
  pageSize: 'letter',
  orientation: 'auto',
  marginMm: 10,
};

function imageFile(name: string, type: string, base64: string) {
  return new File([Buffer.from(base64, 'base64')], name, { type });
}

describe('getPageDimensions', () => {
  it('uses portrait A4 for portrait and square images in automatic mode', () => {
    expect(getPageDimensions(800, 1200, a4Options)).toEqual(A4_PORTRAIT);
    expect(getPageDimensions(800, 800, a4Options)).toEqual(A4_PORTRAIT);
  });

  it('uses landscape A4 for landscape images in automatic mode', () => {
    expect(getPageDimensions(1200, 800, a4Options)).toEqual({
      width: A4_PORTRAIT.height,
      height: A4_PORTRAIT.width,
    });
  });

  it('uses portrait and landscape Letter dimensions', () => {
    expect(getPageDimensions(800, 1200, letterOptions)).toEqual(LETTER_PORTRAIT);
    expect(getPageDimensions(1200, 800, letterOptions)).toEqual({
      width: LETTER_PORTRAIT.height,
      height: LETTER_PORTRAIT.width,
    });
  });

  it('preserves image dimensions for image-sized pages', () => {
    expect(getPageDimensions(1200, 800, { ...a4Options, pageSize: 'image' })).toEqual({
      width: 1200,
      height: 800,
    });
  });
});

describe('calculateImagePlacement', () => {
  it('centers an image, preserves ratio, and respects margin', () => {
    const placement = calculateImagePlacement(1200, 600, 600, 800, 10);
    expect(placement.width).toBeCloseTo(600 - (20 * 72) / 25.4, 5);
    expect(placement.height).toBeCloseTo(placement.width / 2, 5);
    expect(placement.x).toBeCloseTo((10 * 72) / 25.4, 5);
    expect(placement.y).toBeCloseTo((800 - placement.height) / 2, 5);
  });
});

describe('imagesToPdf', () => {
  it('creates one page per PNG/JPG and reports source order', async () => {
    const files = [
      imageFile('primera.png', 'image/png', pngBase64),
      imageFile('segunda.jpg', 'image/jpeg', jpegBase64),
    ];
    const names: string[] = [];
    const bytes = await imagesToPdf(files, a4Options, ({ filename }) => names.push(filename));
    const document = await PDFDocument.load(bytes);

    expect(document.getPageCount()).toBe(2);
    expect(names).toEqual(['primera.png', 'segunda.jpg']);
    document.getPages().forEach((page) => {
      expect(page.getWidth()).toBeCloseTo(A4_PORTRAIT.width, 2);
      expect(page.getHeight()).toBeCloseTo(A4_PORTRAIT.height, 2);
    });
  });

  it('rejects unsupported formats with filename', async () => {
    const file = imageFile('foto.webp', 'image/webp', pngBase64);
    await expect(imagesToPdf([file], a4Options)).rejects.toThrow('foto.webp');
  });

  it('creates Letter pages with requested orientation', async () => {
    const file = imageFile('carta.png', 'image/png', pngBase64);
    const bytes = await imagesToPdf([file], { ...letterOptions, orientation: 'landscape' });
    const [page] = (await PDFDocument.load(bytes)).getPages();

    expect(page.getWidth()).toBe(LETTER_PORTRAIT.height);
    expect(page.getHeight()).toBe(LETTER_PORTRAIT.width);
  });
});
