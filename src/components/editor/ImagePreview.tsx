'use client';

import { useEffect, useState } from 'react';

interface ImagePreviewProps {
  file: File;
}

export function ImagePreview({ file }: ImagePreviewProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  if (!url) return null;

  return <img src={url} alt="" className="h-full w-full object-contain" draggable={false} />;
}
