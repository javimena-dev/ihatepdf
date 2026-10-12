'use client';

import { ChangeEvent, DragEvent, ReactNode, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

const pdfMime = 'application/pdf';
const imageMimes = ['image/png', 'image/jpeg'];
const defaultPdfMaxFiles = 5;
const defaultPdfMaxBytes = 100 * 1024 * 1024;

type AcceptMode = 'pdf' | 'image';
type LimitPolicy = 'warn' | 'reject';

interface DropzoneProps {
  mode: AcceptMode;
  currentFileCount?: number;
  currentBytes?: number;
  multiple?: boolean;
  disabled?: boolean;
  maxFiles?: number;
  maxBytes?: number;
  limitPolicy?: LimitPolicy;
  label: string;
  help?: ReactNode;
  onFiles: (files: File[]) => void;
  onError?: (message: string) => void;
}

export function Dropzone({
  mode,
  currentFileCount = 0,
  currentBytes = 0,
  multiple = true,
  disabled = false,
  maxFiles,
  maxBytes,
  limitPolicy = 'warn',
  label,
  help,
  onFiles,
  onError,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const accept = mode === 'pdf' ? pdfMime : imageMimes.join(',');
  const effectiveMaxFiles = maxFiles ?? (mode === 'pdf' ? defaultPdfMaxFiles : undefined);
  const effectiveMaxBytes = maxBytes ?? (mode === 'pdf' ? defaultPdfMaxBytes : undefined);

  function validate(files: File[]) {
    const allowed = mode === 'pdf' ? [pdfMime] : imageMimes;
    const invalid = files.find((file) => !allowed.includes(file.type));
    if (invalid) {
      onError?.(`"${invalid.name}" no es ${mode === 'pdf' ? 'PDF' : 'PNG/JPG'}.`);
      return [];
    }

    const nextCount = currentFileCount + files.length;
    const nextBytes = currentBytes + files.reduce((sum, file) => sum + file.size, 0);
    const filesExceeded = effectiveMaxFiles !== undefined && nextCount > effectiveMaxFiles;
    const bytesExceeded = effectiveMaxBytes !== undefined && nextBytes > effectiveMaxBytes;

    if (filesExceeded || bytesExceeded) {
      const limits = [
        effectiveMaxFiles !== undefined ? `${effectiveMaxFiles} archivos` : null,
        effectiveMaxBytes !== undefined ? `${Math.round(effectiveMaxBytes / 1024 / 1024)}MB acumulados` : null,
      ].filter(Boolean);
      onError?.(`${limitPolicy === 'reject' ? 'Limite superado' : 'Limite recomendado superado'}: maximo ${limits.join(' o ')}.`);
      if (limitPolicy === 'reject') return [];
    }

    return multiple ? files : files.slice(0, 1);
  }

  function handleFiles(fileList: FileList | null) {
    const valid = validate(Array.from(fileList ?? []));
    if (valid.length) onFiles(valid);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    event.target.value = '';
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-lg border border-dashed p-4 text-left transition ${
        disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
          : dragging
          ? 'border-red-400 bg-red-50'
          : 'border-gray-300 bg-white hover:bg-gray-50'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} disabled={disabled} hidden onChange={handleInput} />
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-gray-100 text-gray-700">
          <Upload size={18} />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-950">{label}</p>
          {help ? <p className="mt-1 text-xs leading-5 text-gray-500">{help}</p> : null}
        </div>
      </div>
    </div>
  );
}
