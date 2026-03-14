import { memo, useMemo } from 'react';

interface GanttGridBackgroundProps {
  visibleDays: number;
  dayColumnWidth: number;
  rowCount: number;
  rowHeight: number;
  dayDates: Date[];
  monthBoundaryIndexSet: Set<number>;
  isTodayCell: (date: Date) => boolean;
  isHolidayCell: (date: Date) => boolean;
}

/**
 * Renders a single shared background grid layer instead of per-row day-cell divs.
 * This reduces DOM nodes from N_rows × N_days to just N_days.
 */
export const GanttGridBackground = memo(function GanttGridBackground({
  visibleDays,
  dayColumnWidth,
  rowCount,
  rowHeight,
  dayDates,
  monthBoundaryIndexSet,
  isTodayCell,
  isHolidayCell,
}: GanttGridBackgroundProps) {
  const totalHeight = rowCount * rowHeight;

  const columns = useMemo(() => {
    return dayDates.map((date, index) => {
      const isToday = isTodayCell(date);
      const isHoliday = isHolidayCell(date);
      const bg = isToday ? '#ffedd5' : isHoliday ? '#f3f4f6' : 'transparent';
      const borderLeft =
        index === 0
          ? 'none'
          : `1px solid ${monthBoundaryIndexSet.has(index) ? '#cbd5e1' : '#e2e8f0'}`;

      return (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: index * dayColumnWidth,
            width: dayColumnWidth,
            top: 0,
            height: totalHeight,
            background: bg,
            borderLeft,
            pointerEvents: 'none',
          }}
        />
      );
    });
  }, [dayDates, dayColumnWidth, totalHeight, monthBoundaryIndexSet, isTodayCell, isHolidayCell]);

  // Row separator lines
  const rowLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    for (let i = 0; i < rowCount; i++) {
      lines.push(
        <div
          key={`row-${i}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: i * rowHeight,
            height: 1,
            background: '#f1f5f9',
            pointerEvents: 'none',
          }}
        />,
      );
    }
    return lines;
  }, [rowCount, rowHeight]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: visibleDays * dayColumnWidth,
        height: totalHeight,
        pointerEvents: 'none',
      }}
    >
      {columns}
      {rowLines}
    </div>
  );
});
