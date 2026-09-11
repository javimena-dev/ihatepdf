# Plan de Implementación v2: Editor de PDF Client-Side

> Versión 2. Incorpora correcciones críticas sobre canvas, virtualización, coordenadas con scroll, estado global y memoria.
> Privacidad total — archivos nunca salen del navegador. Infraestructura: $0.

---

## 1. Stack

<stack>
| Tecnología | Rol |
|---|---|
| Next.js App Router | Framework — rutas, renderizado, tipado |
| Tailwind CSS | Estilos minimalistas |
| Lucide React | Iconografía vectorial |
| pdf-lib | Modificación binaria PDF (merge, split, delete, imágenes) |
| react-pdf | Renderizado visual (PDF.js) |
| react-rnd | Drag & drop + resize de imágenes sobre canvas |
| **Zustand** ⭐ | Estado global — PDFs, páginas, imágenes |
| **react-virtual** ⭐ | Virtualización de cuadrícula — rendimiento con PDFs grandes |
</stack>

---

## 2. Estructura del Proyecto

<project_structure>
```
pdf-editor-client/src/
├── app/
│   ├── page.tsx              # Dashboard de herramientas (estilo ilovepdf)
│   └── editor/page.tsx       # Editor (?mode=merge|split|edit)
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   └── Dropzone.tsx      # Solo acepta PDF / PNG / JPG
│   ├── editor/
│   │   ├── Sidebar.tsx       # Panel derecho — acciones y exportación
│   │   ├── PageGrid.tsx      # Cuadrícula virtualizada
│   │   ├── PageCard.tsx      # Miniatura individual con botón de borrar
│   │   └── ImageCanvas.tsx   # Sistema de capas para insertar imágenes
│   └── layout/Navbar.tsx
├── store/usePdfStore.ts      # ⭐ Zustand
├── hooks/usePdfProcessor.ts  # Lógica core: export, merge, split
└── utils/coordinates.ts      # Conversión HTML px → PDF points
```

**Routing:** `/editor?mode=merge` | `/editor?mode=split` | `/editor?mode=edit`
</project_structure>

---

## 3. Estado Global (Zustand)

> ⚠️ Usar desde el inicio. `useState` local no escala con múltiples PDFs, páginas eliminadas e imágenes por página.

<zustand_store file="store/usePdfStore.ts">
```typescript
import { create } from 'zustand';

interface LoadedPdf {
  id: string; name: string; bytes: ArrayBuffer; pageCount: number;
}
interface ImageOverlay {
  id: string; pageIndex: number; imageFile: File;
  htmlCoords: { x: number; y: number; width: number; height: number };
  htmlPageDimensions: { width: number; height: number };
}
interface PdfStore {
  files: LoadedPdf[];
  pagesToDelete: Set<number>;
  insertedImages: ImageOverlay[];
  activeFileId: string | null;
  addFile: (f: LoadedPdf) => void;
  togglePageDelete: (i: number) => void;
  addImage: (o: ImageOverlay) => void;
  updateImageCoords: (id: string, c: ImageOverlay['htmlCoords']) => void;
}

export const usePdfStore = create<PdfStore>((set) => ({
  files: [], pagesToDelete: new Set(), insertedImages: [], activeFileId: null,
  addFile: (file) => set((s) => ({ files: [...s.files, file] })),
  togglePageDelete: (index) => set((s) => {
    const next = new Set(s.pagesToDelete);
    next.has(index) ? next.delete(index) : next.add(index);
    return { pagesToDelete: next };
  }),
  addImage: (overlay) => set((s) => ({ insertedImages: [...s.insertedImages, overlay] })),
  updateImageCoords: (id, coords) => set((s) => ({
    insertedImages: s.insertedImages.map((img) =>
      img.id === id ? { ...img, htmlCoords: coords } : img
    ),
  })),
}));
```
</zustand_store>

---

## 4. Fases de Desarrollo

> **Orden recomendado:** Fase 4 primero (mayor riesgo técnico) → Fases 1-2-3 → UI final.

### Fase 1 — Configuración e Ingesta

<fase id="1" objetivo="Cargar uno o múltiples PDFs en memoria">

**Setup:**
```bash
npm install pdf-lib react-pdf react-rnd zustand @tanstack/react-virtual lucide-react
```

**Validación MIME estricta:**
```typescript
const ALLOWED = { pdf: 'application/pdf', img: ['image/png','image/jpeg'] };
if (file.type !== ALLOWED.pdf) { showError(`"${file.name}" no es PDF`); return; }
```

**Límites de memoria:** Alertar si >5 archivos o >100MB acumulados antes de proceder.
Almacenar en Zustand como `ArrayBuffer`.
</fase>

---

### Fase 2 — Previsualización Virtualizada y Eliminación de Páginas

<fase id="2" objetivo="Mostrar el PDF con buen rendimiento y permitir eliminar páginas">

<warning titulo="Rendimiento crítico">
`react-pdf` renderiza en el hilo principal. Con 50+ páginas visibles la UI se congela.
**Solución obligatoria: virtualización con `react-virtual`.**
</warning>

<code file="components/editor/PageGrid.tsx" lang="tsx">
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function PageGrid({ totalPages }: { totalPages: number }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: totalPages,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,  // px por miniatura
    overscan: 3,
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => (
          <div key={vItem.index} style={{ position:'absolute', top:0,
            transform: `translateY(${vItem.start}px)` }}>
            <PageCard pageNumber={vItem.index + 1} />
          </div>
        ))}
      </div>
    </div>
  );
}
```
</code>

**Eliminación:** Checkbox flotante por miniatura → `pagesToDelete` en Zustand → filtrado en exportación.
</fase>

---

### Fase 3 — Merge y Split

<fase id="3" objetivo="Fusionar múltiples PDFs y dividir por rango de páginas">

<code id="merge" lang="typescript">
```typescript
async function mergePdfs(files: LoadedPdf[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const src = await PDFDocument.load(file.bytes);
    const indices = Array.from({ length: src.getPageCount() }, (_, i) => i);
    const pages = await merged.copyPages(src, indices);
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}
```
</code>

<code id="split" lang="typescript">
```typescript
async function splitPdf(bytes: ArrayBuffer, range: number[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes);
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, range.map(n => n - 1)); // 0-indexed
  pages.forEach((p) => doc.addPage(p));
  return doc.save();
}
```
</code>
</fase>

---

### Fase 4 — Lienzo Visual (Inserción de Imágenes)

<fase id="4" objetivo="Arrastrar y redimensionar imágenes sobre una página, fusionarlas en el PDF">

<warning titulo="Canvas + react-rnd: sistema de capas obligatorio">
`react-pdf` renderiza un `<canvas>` que no es posicionable como contenedor DOM.
Solución: **dos capas con `position: relative/absolute`** y dimensiones explícitas idénticas.
</warning>

<code file="components/editor/ImageCanvas.tsx" lang="tsx">
```tsx
export function ImageCanvas({ pageNumber, pdfBytes }: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    // Capa 1 — contenedor padre con dimensiones fijas explícitas
    <div ref={containerRef}
      style={{ position: 'relative', width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX }}>

      {/* Capa 2 — canvas de react-pdf */}
      <Document file={pdfBytes}>
        <Page pageNumber={pageNumber} width={PAGE_WIDTH_PX}
          renderTextLayer={false} renderAnnotationLayer={false} />
      </Document>

      {/* Capa 3 — overlay para react-rnd */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {images.map((img) => (
          <Rnd key={img.id} style={{ pointerEvents: 'all' }} bounds="parent"
            default={{ x: img.htmlCoords.x, y: img.htmlCoords.y,
                       width: img.htmlCoords.width, height: img.htmlCoords.height }}
            onDragStop={(_, d) =>
              updateImageCoords(img.id, { ...img.htmlCoords, x: d.x, y: d.y })}
            onResizeStop={(_, __, ref, ___, pos) =>
              updateImageCoords(img.id, {
                x: pos.x, y: pos.y,
                width: ref.offsetWidth, height: ref.offsetHeight,
              })}>
            <img src={URL.createObjectURL(img.imageFile)}
              style={{ width: '100%', height: '100%' }} />
          </Rnd>
        ))}
      </div>
    </div>
  );
}
```
</code>

<warning titulo="Bug conocido: coordenadas react-rnd con scroll">
Las coordenadas reportadas se desplazan cuando el contenedor tiene scroll.
**Corrección:** capturar siempre la posición relativa al contenedor, no a la ventana.
</warning>

<code id="scroll-fix" lang="typescript">
```typescript
const containerEl = containerRef.current;
const rect = containerEl.getBoundingClientRect();
const correctedX = rndX - rect.left + containerEl.scrollLeft;
const correctedY = rndY - rect.top  + containerEl.scrollTop;
updateImageCoords(img.id, { x: correctedX, y: correctedY,
  width: ref.offsetWidth, height: ref.offsetHeight });
```
</code>
</fase>

---

## 5. Transformación de Coordenadas HTML → PDF

<coordinate_system>
| | Web (HTML) | PDF |
|---|---|---|
| Origen (0,0) | Esquina superior izquierda | Esquina inferior izquierda |
| Eje Y | Crece hacia abajo | Crece hacia arriba |
| Unidades | px | Points (1 pulgada = 72 pts) |

PDF Carta = `612 × 792` pts. Una pantalla lo renderiza en ~`400 × 566` px.
Los factores de escala **nunca son 1**.
</coordinate_system>

<code file="utils/coordinates.ts" lang="typescript">
```typescript
export interface HtmlCoords { x: number; y: number; width: number; height: number; }
export interface PdfCoords  { x: number; y: number; width: number; height: number; }

export function convertHtmlToPdfCoords(
  html: HtmlCoords,
  htmlW: number, htmlH: number,
  pdfW: number,  pdfH: number
): PdfCoords {
  const scaleX = pdfW / htmlW;
  const scaleY = pdfH / htmlH;
  return {
    x:      html.x * scaleX,
    y:      (htmlH - html.y - html.height) * scaleY,  // inversión eje Y
    width:  html.width  * scaleX,
    height: html.height * scaleY,
  };
}
```
</code>

---

## 6. Motor de Exportación

<code file="hooks/usePdfProcessor.ts" lang="typescript">
```typescript
import { PDFDocument } from 'pdf-lib';
import { convertHtmlToPdfCoords } from '@/utils/coordinates';

async function exportModifiedPdf(
  originalBytes: ArrayBuffer,
  pagesToDelete: Set<number>,
  insertedImages: ImageOverlay[]
) {
  const srcDoc = await PDFDocument.load(originalBytes);
  const pdfDoc = await PDFDocument.create();

  // 1. Filtrar páginas
  const keep = Array.from({ length: srcDoc.getPageCount() }, (_, i) => i)
    .filter((i) => !pagesToDelete.has(i));
  const copied = await pdfDoc.copyPages(srcDoc, keep);
  copied.forEach((p) => pdfDoc.addPage(p));

  // 2. Incrustar imágenes
  for (const item of insertedImages) {
    const page = pdfDoc.getPage(item.pageIndex);
    const { width: pdfW, height: pdfH } = page.getSize();
    const imgBytes = await item.imageFile.arrayBuffer();
    const embedded = item.imageFile.type === 'image/png'
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);
    const coords = convertHtmlToPdfCoords(
      item.htmlCoords,
      item.htmlPageDimensions.width, item.htmlPageDimensions.height,
      pdfW, pdfH
    );
    page.drawImage(embedded, coords);
  }

  // 3. Descargar + limpiar memoria
  const blob = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: 'editado.pdf' }).click();
  URL.revokeObjectURL(url); // ⭐ limpieza obligatoria
}
```
</code>

---

## 7. Gestión de Memoria

<memory_rules>
1. **`revokeObjectURL` en cada `useEffect`** — no solo en exportación:
```typescript
useEffect(() => {
  const url = URL.createObjectURL(imageFile);
  setPreviewUrl(url);
  return () => URL.revokeObjectURL(url); // cleanup en unmount
}, [imageFile]);
```

2. **Solo el PDF activo en `ArrayBuffer`** — los demás permanecen como `File` hasta procesarse.

3. **Límites:** máx. 5 archivos / 100MB acumulados — advertencia visible, no bloqueo silencioso.

4. **Limpiar Zustand** al cambiar de modo o descartar archivos — sin `ArrayBuffer`s huérfanos.
</memory_rules>

---

## 8. Estilo (Inspirado en ilovepdf)

<ui_guidelines>
**Dashboard (`/`):** cuadrícula de cards, una por herramienta.
```tsx
const TOOLS = [
  { mode: 'merge', icon: <Merge />,   title: 'Unir PDFs',   color: 'bg-red-500' },
  { mode: 'split', icon: <Scissors />, title: 'Dividir PDF', color: 'bg-orange-500' },
  { mode: 'edit',  icon: <Pencil />,   title: 'Editar PDF',  color: 'bg-blue-500' },
];
// Cada card → /editor?mode={mode}
```

**Principios:**
- Fondo `gray-50`, bordes sutiles `border-gray-200`, sin sombras agresivas
- Acento de color distinto por herramienta
- Layout del editor: miniaturas izq. | canvas centro | opciones der.
- Tipografía: Inter o similar sans-serif
</ui_guidelines>

---

## 9. Roadmap y Checklist

<roadmap>
```
Semana 1 → Prototipo Fase 4 (canvas + rnd + coordenadas)
Semana 2 → Fases 1+2 (upload + Zustand + cuadrícula virtual + delete)
Semana 3 → Fase 3 (merge + split)
Semana 4 → UI final + validaciones + memoria
```
</roadmap>

<checklist>
- [ ] Validación MIME en dropzone (`application/pdf`, `image/png`, `image/jpeg`)
- [ ] Virtualización activa en PageGrid
- [ ] Corrección de coordenadas react-rnd con scroll
- [ ] `revokeObjectURL` en todos los `useEffect` de previsualizaciones
- [ ] Alertas de límite de memoria (5 archivos / 100MB)
- [ ] Routing `/editor?mode=` funcionando
- [ ] Prototipo de coordenadas validado contra PDF real antes de integrar UI
</checklist>

---

## 10. Dependencias

<deps file="package.json">
```json
{
  "dependencies": {
    "next": "^14.0.0", "react": "^18.0.0", "react-dom": "^18.0.0",
    "pdf-lib": "^1.17.1", "react-pdf": "^7.0.0", "react-rnd": "^10.4.1",
    "zustand": "^4.5.0", "@tanstack/react-virtual": "^3.0.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0", "tailwindcss": "^3.4.0", "@types/react": "^18.0.0"
  }
}
```
</deps>