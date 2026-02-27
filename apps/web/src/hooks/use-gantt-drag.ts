import { useCallback, useRef, useState, useEffect } from 'react';
import { addDays, startOfDay } from 'date-fns';
import { clampDate, diffDays } from '@/lib/gantt-utils';

type DragEdge = 'left' | 'right';

interface UseGanttDragOptions {
  issueId: string;
  startDate: Date;
  endDate: Date;
  timelineStart: Date;
  timelineEnd: Date;
  dayWidthPx: number;
  onResize: (issueId: string, newStart: Date, newEnd: Date) => void;
  minDurationDays?: number;
}

interface DragState {
  edge: DragEdge;
  initialMouseX: number;
  initialStart: Date;
  initialEnd: Date;
}

export function useGanttDrag({
  issueId,
  startDate,
  endDate,
  timelineStart,
  timelineEnd,
  dayWidthPx,
  onResize,
  minDurationDays = 1,
}: UseGanttDragOptions) {
  const [previewDates, setPreviewDates] = useState<{ start: Date; end: Date } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);

  const computeNewDates = useCallback(
    (state: DragState, clientX: number) => {
      const deltaX = clientX - state.initialMouseX;
      const deltaDays = Math.round(deltaX / dayWidthPx);

      let newStart = state.initialStart;
      let newEnd = state.initialEnd;

      if (state.edge === 'left') {
        newStart = addDays(state.initialStart, deltaDays);
        // Enforce min duration
        const maxStart = addDays(newEnd, -(minDurationDays - 1));
        if (newStart > maxStart) newStart = maxStart;
        newStart = clampDate(newStart, timelineStart, timelineEnd);
      } else {
        newEnd = addDays(state.initialEnd, deltaDays);
        // Enforce min duration
        const minEnd = addDays(newStart, minDurationDays - 1);
        if (newEnd < minEnd) newEnd = minEnd;
        newEnd = clampDate(newEnd, timelineStart, timelineEnd);
      }

      return { start: startOfDay(newStart), end: startOfDay(newEnd) };
    },
    [dayWidthPx, minDurationDays, timelineStart, timelineEnd],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current) return;
      didDragRef.current = true;
      const dates = computeNewDates(dragRef.current, e.clientX);
      setPreviewDates(dates);
    },
    [computeNewDates],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dates = computeNewDates(dragRef.current, e.clientX);
      dragRef.current = null;
      setPreviewDates(null);
      onResize(issueId, dates.start, dates.end);

      // Prevent the click event from opening the modal
      setTimeout(() => {
        didDragRef.current = false;
      }, 0);
    },
    [computeNewDates, issueId, onResize],
  );

  useEffect(() => {
    if (!dragRef.current && !previewDates) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, previewDates]);

  const createHandleProps = useCallback(
    (edge: DragEdge) => ({
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        didDragRef.current = false;
        dragRef.current = {
          edge,
          initialMouseX: e.clientX,
          initialStart: startDate,
          initialEnd: endDate,
        };
        setPreviewDates({ start: startDate, end: endDate });
      },
    }),
    [startDate, endDate],
  );

  const isDragging = previewDates !== null;

  // Compute preview bar style
  const previewStyle = previewDates
    ? {
        left: diffDays(previewDates.start, timelineStart) * dayWidthPx,
        width: Math.max(diffDays(previewDates.end, previewDates.start) + 1, 1) * dayWidthPx,
      }
    : null;

  return {
    leftHandleProps: createHandleProps('left'),
    rightHandleProps: createHandleProps('right'),
    isDragging,
    previewStyle,
    didDragRef,
  };
}
