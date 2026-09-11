export interface HtmlCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function convertHtmlToPdfCoords(
  html: HtmlCoords,
  htmlW: number,
  htmlH: number,
  pdfW: number,
  pdfH: number,
): PdfCoords {
  const scaleX = pdfW / htmlW;
  const scaleY = pdfH / htmlH;

  return {
    x: html.x * scaleX,
    y: (htmlH - html.y - html.height) * scaleY,
    width: html.width * scaleX,
    height: html.height * scaleY,
  };
}

export function getRelativeCoords(
  x: number,
  y: number,
  container: HTMLElement,
): Pick<HtmlCoords, 'x' | 'y'> {
  const rect = container.getBoundingClientRect();
  return {
    x: x - rect.left + container.scrollLeft,
    y: y - rect.top + container.scrollTop,
  };
}
