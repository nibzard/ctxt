// ABOUTME: Drop zone indicator component for drag and drop operations
// ABOUTME: Provides visual feedback during drag operations between sortable items

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

interface DropZoneProps {
  index: number;
  onDrop: (sourceIndex: number, targetIndex: number) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ index, onDrop }) => {
  const [isOver, setIsOver] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => source.data.type === 'context-block',
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: ({ source }) => {
        setIsOver(false);
        const sourceIndex = source.data.index as number;
        onDrop(sourceIndex, index);
      },
    });
  }, [index, onDrop]);

  return (
    <div
      ref={elementRef}
      className={`h-2 mx-4 rounded transition-all duration-200 ${
        isOver 
          ? 'bg-blue-400 h-4 shadow-md' 
          : 'bg-transparent hover:bg-gray-200'
      }`}
    />
  );
};