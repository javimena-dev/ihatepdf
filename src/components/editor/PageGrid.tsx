'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PageCard } from '@/components/editor/PageCard';

export interface PageItem {
  fileId: string;
  pageNumber: number;
  pdfBytes: ArrayBuffer;
  fileName: string;
}

interface PageGridProps {
  items: PageItem[];
  selectedPageIndex: number;
  onSelectPage: (pageIndex: number) => void;
  showMergeLabels?: boolean;
}

export function PageGrid({ items, selectedPageIndex, onSelectPage, showMergeLabels = false }: PageGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (showMergeLabels ? 330 : 300),
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full w-full overflow-y-auto overflow-x-hidden px-3 py-4">
      <div className="relative mx-auto w-[190px]" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;

          return (
            <div
              key={virtualItem.key}
              className="absolute left-0 top-0 w-full pb-4"
              style={{ height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }}
            >
              <PageCard
                pageNumber={item.pageNumber}
                pdfBytes={item.pdfBytes}
                selected={selectedPageIndex === virtualItem.index}
                onSelect={onSelectPage}
                fileId={item.fileId}
                fileName={showMergeLabels ? item.fileName : undefined}
                overallIndex={showMergeLabels ? virtualItem.index + 1 : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
