import { Box, Text } from 'ink';
import type React from 'react';

const CELL_COLOR_PALETTE = [
  'yellow',
  'cyan',
  'magenta',
  'green',
  '#ff8c00',
  'yellowBright',
  'greenBright',
  'cyanBright',
] as const;
type TableCellColor = (typeof CELL_COLOR_PALETTE)[number];

export interface TableColumn<T> {
  header: string;
  cell: (row: T) => string;
  minWidth?: number;
}

export interface TableProps<T> {
  columns: ReadonlyArray<TableColumn<T>>;
  rows: ReadonlyArray<T>;
  gutter?: string;
}

function padRight(value: string, width: number): string {
  if (value.length >= width) return value;
  return value + ' '.repeat(width - value.length);
}

function computeColumnWidths<T>(columns: ReadonlyArray<TableColumn<T>>, rows: ReadonlyArray<T>): number[] {
  return columns.map((col) => {
    let longestCell = 0;
    for (const row of rows) {
      const text = col.cell(row);
      if (text.length > longestCell) longestCell = text.length;
    }
    return Math.max(col.header.length, longestCell, col.minWidth ?? 0);
  });
}

function colorForColumn(index: number): TableCellColor {
  return CELL_COLOR_PALETTE[index % CELL_COLOR_PALETTE.length] as TableCellColor;
}

export function Table<T>({ columns, rows, gutter = '  ' }: TableProps<T>): React.ReactElement {
  const widths = computeColumnWidths(columns, rows);
  const lastIndex = columns.length - 1;

  const headerCells = columns.map((col, idx) => {
    const text = idx === lastIndex ? col.header : padRight(col.header, widths[idx] ?? 0);
    return (
      <Text key={`h-${col.header}-${String(idx)}`}>
        {idx > 0 ? gutter : ''}
        <Text bold>{text}</Text>
      </Text>
    );
  });

  const separatorCells = columns.map((col, idx) => {
    const width = widths[idx] ?? 0;
    return (
      <Text key={`s-${col.header}-${String(idx)}`}>
        {idx > 0 ? gutter : ''}
        <Text dimColor>{'-'.repeat(width)}</Text>
      </Text>
    );
  });

  return (
    <Box flexDirection="column">
      <Text>{headerCells}</Text>
      <Text>{separatorCells}</Text>
      {rows.map((row, rowIdx) => (
        <Text key={`row-${String(rowIdx)}`}>
          {columns.map((col, colIdx) => {
            const raw = col.cell(row);
            const text = colIdx === lastIndex ? raw : padRight(raw, widths[colIdx] ?? 0);
            const color = colorForColumn(colIdx);
            return (
              <Text key={`c-${String(colIdx)}-${col.header}`}>
                {colIdx > 0 ? gutter : ''}
                <Text color={color}>{text}</Text>
              </Text>
            );
          })}
        </Text>
      ))}
    </Box>
  );
}

export type { TableCellColor };
