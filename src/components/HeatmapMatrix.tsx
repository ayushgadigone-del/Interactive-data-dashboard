import React, { useMemo } from 'react';
import { ColumnMetadata, DataRow } from '../types';

interface HeatmapMatrixProps {
  data: DataRow[];
  columns: ColumnMetadata[];
  rowKey: string;
  colKey: string;
  valKey: string;
  onSelectCell?: (rowVal: string, colVal: string, val: number) => void;
}

export const HeatmapMatrix: React.FC<HeatmapMatrixProps> = ({
  data,
  columns,
  rowKey,
  colKey,
  valKey,
  onSelectCell,
}) => {
  const { rowLabels, colLabels, matrix, minVal, maxVal } = useMemo(() => {
    const rSet = new Set<string>();
    const cSet = new Set<string>();

    const grid = new Map<string, number>();

    data.forEach((item) => {
      const r = String(item[rowKey] ?? '(Empty)');
      const c = String(item[colKey] ?? '(Empty)');
      const v = Number(item[valKey]) || 0;

      rSet.add(r);
      cSet.add(c);

      const cellId = `${r}:::${c}`;
      grid.set(cellId, (grid.get(cellId) || 0) + v);
    });

    const rows = Array.from(rSet);
    const cols = Array.from(cSet);

    const vals = Array.from(grid.values());
    const min = vals.length > 0 ? Math.min(...vals) : 0;
    const max = vals.length > 0 ? Math.max(...vals) : 1;

    return {
      rowLabels: rows,
      colLabels: cols,
      matrix: grid,
      minVal: min,
      maxVal: max,
    };
  }, [data, rowKey, colKey, valKey]);

  // Color intensity calculation
  const getIntensityStyle = (val: number | undefined) => {
    if (val === undefined || val === 0) {
      return { backgroundColor: '#f8fafc', color: '#64748b' };
    }
    const ratio = maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 0.5;
    
    // Indigo scale
    if (ratio < 0.2) return { backgroundColor: '#e0e7ff', color: '#3730a3' };
    if (ratio < 0.4) return { backgroundColor: '#c7d2fe', color: '#312e81' };
    if (ratio < 0.6) return { backgroundColor: '#a5b4fc', color: '#1e1b4b' };
    if (ratio < 0.8) return { backgroundColor: '#818cf8', color: '#ffffff' };
    return { backgroundColor: '#4f46e5', color: '#ffffff' };
  };

  const formatValue = (num: number | undefined) => {
    if (num === undefined) return '-';
    if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return Number.isInteger(num) ? num.toString() : num.toFixed(1);
  };

  if (rowLabels.length === 0 || colLabels.length === 0) {
    return (
      <div className="p-8 text-center text-stone-500 text-xs">
        Select valid Row, Column, and Value dimensions to display the Heatmap Matrix.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="min-w-max">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-2.5 text-left text-xs font-semibold text-stone-600 bg-stone-50/60 border-b border-stone-200">
                {rowKey} \ {colKey}
              </th>
              {colLabels.map((col) => (
                <th
                  key={col}
                  className="p-2.5 text-center text-xs font-semibold text-stone-700 bg-stone-50/60 border-b border-stone-200 min-w-[90px]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((row) => (
              <tr key={row} className="border-b border-stone-100">
                <td className="p-2.5 text-xs font-semibold text-stone-800 bg-stone-50/40">
                  {row}
                </td>
                {colLabels.map((col) => {
                  const val = matrix.get(`${row}:::${col}`);
                  const style = getIntensityStyle(val);
                  return (
                    <td
                      key={col}
                      onClick={() => onSelectCell && val !== undefined && onSelectCell(row, col, val)}
                      style={style}
                      className="p-2.5 text-center text-xs font-medium cursor-pointer transition-transform hover:scale-105 rounded-xs"
                      title={`${row} × ${col}: ${val !== undefined ? val.toLocaleString() : '0'}`}
                    >
                      {formatValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-stone-500">
          <span>Low: {formatValue(minVal)}</span>
          <div className="flex h-3 w-32 rounded overflow-hidden border border-stone-200">
            <div className="flex-1 bg-[#e0e7ff]" />
            <div className="flex-1 bg-[#c7d2fe]" />
            <div className="flex-1 bg-[#a5b4fc]" />
            <div className="flex-1 bg-[#818cf8]" />
            <div className="flex-1 bg-[#4f46e5]" />
          </div>
          <span>High: {formatValue(maxVal)}</span>
        </div>
      </div>
    </div>
  );
};
