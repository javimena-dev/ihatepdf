# IHatePDF Client

Editor de PDF client-side basado en Next.js. Los archivos se cargan en memoria del navegador y se procesan localmente con `pdf-lib`.

## Comandos

```bash
npm install
npm run dev
```

Luego abre `http://localhost:3000`.

## Rutas

- `/` dashboard de herramientas
- `/editor?mode=merge`
- `/editor?mode=split`
- `/editor?mode=edit`

## Implementado

- Validacion MIME para PDF, PNG y JPG.
- Advertencia de limite recomendado: 5 archivos o 100MB.
- Estado global con Zustand.
- Miniaturas virtualizadas con `@tanstack/react-virtual`.
- Eliminacion de paginas antes de exportar.
- Merge y split con `pdf-lib`.
- Insercion de imagenes con capas sobre `react-pdf` y `react-rnd`.
- Conversion de coordenadas HTML a puntos PDF.
- Limpieza de `ObjectURL` en previews y descargas.
