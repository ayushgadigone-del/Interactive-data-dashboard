import React, { useState, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Info, 
  Download, 
  Filter, 
  ScatterChart as ScatterIcon, 
  Check, 
  Sparkles,
  ArrowRight,
  Maximize2,
  X,
  HelpCircle
} from 'lucide-react';
import { ColumnMetadata, DataRow } from '../types';
import { 
  computeCorrelationMatrix, 
  getCorrelationColor, 
  CorrelationCell,
  CorrelationMatrixResult 
} from '../utils/correlation';
import { exportToCSV } from '../utils/dataParser';
import { HorizontalSlider } from './HorizontalSlider';

interface CorrelationHeatmapProps {
  data: DataRow[];
  columns: ColumnMetadata[];
  datasetName?: string;
  onSwitchToScatter?: (xAxisKey: string, yAxisKey: string) => void;
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  data,
  columns,
  datasetName = 'Dataset',
  onSwitchToScatter,
}) => {
  // Extract all numeric columns
  const allNumericColumns = useMemo(() => {
    return columns.filter((c) => c.type === 'number');
  }, [columns]);

  // Selected columns to include in the matrix (defaults to all numeric columns)
  const [selectedColNames, setSelectedColNames] = useState<string[]>(() => 
    allNumericColumns.map((c) => c.name)
  );

  // Sync if columns change
  React.useEffect(() => {
    setSelectedColNames(allNumericColumns.map((c) => c.name));
  }, [allNumericColumns]);

  // Filter threshold for highlighting: 0 (all), 0.3, 0.5, 0.7
  const [minThreshold, setMinThreshold] = useState<number>(0);

  // Hover state for interactive row/col header highlighting
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string } | null>(null);

  // Selected cell for detailed relationship inspection
  const [selectedCell, setSelectedCell] = useState<CorrelationCell | null>(null);

  // Show column selection popover
  const [showColPicker, setShowColPicker] = useState<boolean>(false);
  const matrixContainerRef = useRef<HTMLDivElement>(null);

  // Compute the correlation matrix
  const correlationResult: CorrelationMatrixResult = useMemo(() => {
    const activeCols = allNumericColumns
      .map((c) => c.name)
      .filter((name) => selectedColNames.includes(name));
    return computeCorrelationMatrix(data, activeCols);
  }, [data, allNumericColumns, selectedColNames]);

  // Auto-select strongest non-diagonal pair on mount or when data changes
  React.useEffect(() => {
    if (correlationResult.pairs.length > 0) {
      setSelectedCell(correlationResult.pairs[0]);
    } else {
      setSelectedCell(null);
    }
  }, [correlationResult.pairs]);

  // Handle toggling a column in the matrix
  const toggleColumn = (colName: string) => {
    if (selectedColNames.includes(colName)) {
      if (selectedColNames.length > 2) {
        setSelectedColNames(selectedColNames.filter((c) => c !== colName));
      }
    } else {
      setSelectedColNames([...selectedColNames, colName]);
    }
  };

  // Export correlation matrix as CSV
  const handleExportMatrixCSV = () => {
    const cols = correlationResult.columns;
    const exportRows: Record<string, any>[] = [];

    for (const rowCol of cols) {
      const rowObj: Record<string, any> = { Metric: rowCol };
      for (const colCol of cols) {
        const cell = correlationResult.matrix[rowCol]?.[colCol];
        rowObj[colCol] = cell ? cell.r.toFixed(4) : '';
      }
      exportRows.push(rowObj);
    }

    exportToCSV(exportRows, `${datasetName.toLowerCase().replace(/\s+/g, '-')}-correlation-matrix.csv`);
  };

  // Early return if not enough numeric columns
  if (allNumericColumns.length < 2) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-500 space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-stone-800">Insufficient Numeric Columns</h3>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          Pearson correlation requires at least two numeric metrics in the dataset to calculate pairwise relationships.
          This dataset contains {allNumericColumns.length} numeric {allNumericColumns.length === 1 ? 'column' : 'columns'}.
        </p>
      </div>
    );
  }

  const { columns: activeCols, matrix, strongestPositivePair, strongestNegativePair, mostCorrelatedColumn } = correlationResult;

  return (
    <div className="space-y-4">
      {/* Top Insights & Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Strongest Positive Relationship */}
        <div 
          onClick={() => strongestPositivePair && setSelectedCell(strongestPositivePair)}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            strongestPositivePair && selectedCell?.colA === strongestPositivePair.colA && selectedCell?.colB === strongestPositivePair.colB
              ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-400/40 shadow-xs'
              : 'bg-white border-stone-200 hover:border-indigo-200 hover:bg-indigo-50/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              Strongest Positive
            </span>
            {strongestPositivePair && (
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100/90 px-1.5 py-0.5 rounded">
                +{strongestPositivePair.r.toFixed(2)}
              </span>
            )}
          </div>
          {strongestPositivePair ? (
            <div>
              <div className="text-xs font-semibold text-stone-900 truncate">
                {strongestPositivePair.colA} <span className="text-stone-400 font-normal">↔</span> {strongestPositivePair.colB}
              </div>
              <p className="text-[11px] text-stone-700 truncate mt-0.5">
                {strongestPositivePair.strengthLabel} linear synergy
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-700">None detected</p>
          )}
        </div>

        {/* Strongest Negative Relationship */}
        <div 
          onClick={() => strongestNegativePair && setSelectedCell(strongestNegativePair)}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            strongestNegativePair && selectedCell?.colA === strongestNegativePair.colA && selectedCell?.colB === strongestNegativePair.colB
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/40 shadow-xs'
              : 'bg-white border-stone-200 hover:border-rose-200 hover:bg-rose-50/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              Strongest Negative
            </span>
            {strongestNegativePair && (
              <span className="font-mono text-xs font-bold text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded">
                {strongestNegativePair.r.toFixed(2)}
              </span>
            )}
          </div>
          {strongestNegativePair ? (
            <div>
              <div className="text-xs font-semibold text-stone-900 truncate">
                {strongestNegativePair.colA} <span className="text-stone-400 font-normal">↔</span> {strongestNegativePair.colB}
              </div>
              <p className="text-[11px] text-stone-700 truncate mt-0.5">
                {strongestNegativePair.strengthLabel} inverse relationship
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-700">None detected</p>
          )}
        </div>

        {/* Most Interconnected Hub Metric */}
        <div className="p-3 rounded-xl border bg-white border-stone-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-stone-600" />
              Central Metric Hub
            </span>
            {mostCorrelatedColumn && (
              <span className="font-mono text-[11px] font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">
                avg |r| {mostCorrelatedColumn.avgAbsR.toFixed(2)}
              </span>
            )}
          </div>
          {mostCorrelatedColumn ? (
            <div>
              <div className="text-xs font-semibold text-stone-900 truncate">
                {mostCorrelatedColumn.column}
              </div>
              <p className="text-[11px] text-stone-700 truncate mt-0.5">
                Highest overall linear association
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-700">-</p>
          )}
        </div>
      </div>

      {/* Heatmap Matrix Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-3">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <span>Filter:</span>
            </div>

            {/* Threshold Filter buttons */}
            <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-xs">
              <button
                type="button"
                id="corr-thresh-all"
                onClick={() => setMinThreshold(0)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer text-[11px] ${
                  minThreshold === 0 ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                All (|r| ≥ 0)
              </button>
              <button
                type="button"
                id="corr-thresh-3"
                onClick={() => setMinThreshold(0.3)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer text-[11px] ${
                  minThreshold === 0.3 ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Filter to meaningful relationships with |r| ≥ 0.3"
              >
                |r| ≥ 0.3
              </button>
              <button
                type="button"
                id="corr-thresh-5"
                onClick={() => setMinThreshold(0.5)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer text-[11px] ${
                  minThreshold === 0.5 ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Filter to moderate and strong relationships with |r| ≥ 0.5"
              >
                |r| ≥ 0.5
              </button>
              <button
                type="button"
                id="corr-thresh-7"
                onClick={() => setMinThreshold(0.7)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer text-[11px] ${
                  minThreshold === 0.7 ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Filter to strong relationships with |r| ≥ 0.7"
              >
                |r| ≥ 0.7
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Columns Inclusion Dropdown */}
            <div className="relative">
              <button
                type="button"
                id="corr-col-picker-btn"
                onClick={() => setShowColPicker(!showColPicker)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
              >
                <span>Columns ({activeCols.length}/{allNumericColumns.length})</span>
              </button>

              {showColPicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColPicker(false)} />
                  <div className="absolute right-0 mt-1.5 w-52 bg-white border border-stone-200 rounded-lg shadow-lg z-40 p-2 text-xs">
                    <div className="font-semibold text-stone-700 mb-1 px-1">Included Metrics</div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {allNumericColumns.map((col) => {
                        const isChecked = selectedColNames.includes(col.name);
                        return (
                          <label
                            key={col.name}
                            className="flex items-center gap-2 px-1.5 py-1 hover:bg-stone-50 rounded cursor-pointer text-stone-700"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isChecked && selectedColNames.length <= 2}
                              onChange={() => toggleColumn(col.name)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer disabled:opacity-50"
                            />
                            <span className="truncate">{col.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Export CSV button */}
            <button
              type="button"
              id="export-corr-matrix-btn"
              onClick={handleExportMatrixCSV}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
              title="Download correlation matrix as CSV"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Color Legend Scale */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-stone-500 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-rose-700">-1.0 (Strong Inverse)</span>
            <div className="flex items-center h-2.5 rounded-full overflow-hidden w-28 border border-stone-200">
              <div className="h-full w-1/4 bg-rose-600" />
              <div className="h-full w-1/4 bg-rose-200" />
              <div className="h-full w-1/4 bg-stone-100" />
              <div className="h-full w-1/4 bg-indigo-200" />
              <div className="h-full w-1/4 bg-indigo-600" />
            </div>
            <span className="font-semibold text-indigo-700">+1.0 (Strong Positive)</span>
          </div>
          <span className="text-[10px] text-stone-600">
            Click any cell to inspect pairwise scatter & relationship details
          </span>
        </div>

        {/* Horizontal Slider for wide matrix columns */}
        <div className="pt-1">
          <HorizontalSlider 
            targetRef={matrixContainerRef} 
            label="Matrix Columns Slider" 
            stepAmount={180} 
          />
        </div>

        {/* Matrix Table */}
        <div ref={matrixContainerRef} className="overflow-x-auto pb-2 scroll-smooth">
          <table className="border-collapse text-xs w-full min-w-max select-none">
            <thead>
              <tr>
                {/* Empty top-left cell */}
                <th className="p-2.5 text-left font-semibold text-stone-400 bg-stone-50/80 border-b border-r border-stone-200 text-[11px]">
                  Metric Pair
                </th>
                {activeCols.map((colName) => {
                  const isHoveredCol = hoveredCell?.col === colName;
                  const isSelectedCol = selectedCell?.colA === colName || selectedCell?.colB === colName;
                  return (
                    <th
                      key={colName}
                      className={`p-2.5 text-center font-semibold border-b border-stone-200 min-w-[96px] max-w-[140px] truncate transition-colors ${
                        isHoveredCol || isSelectedCol
                          ? 'bg-indigo-100/70 text-indigo-950 font-bold'
                          : 'bg-stone-50/80 text-stone-700'
                      }`}
                      title={colName}
                    >
                      {colName}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {activeCols.map((rowName) => {
                const isHoveredRow = hoveredCell?.row === rowName;
                const isSelectedRow = selectedCell?.colA === rowName || selectedCell?.colB === rowName;

                return (
                  <tr key={rowName}>
                    {/* Row Header */}
                    <td
                      className={`p-2.5 text-left font-semibold border-r border-b border-stone-200 min-w-[120px] max-w-[160px] truncate transition-colors ${
                        isHoveredRow || isSelectedRow
                          ? 'bg-indigo-100/70 text-indigo-950 font-bold'
                          : 'bg-stone-50/60 text-stone-800'
                      }`}
                      title={rowName}
                    >
                      {rowName}
                    </td>

                    {/* Matrix Cells */}
                    {activeCols.map((colName) => {
                      const cell = matrix[rowName]?.[colName];
                      const isDiagonal = rowName === colName;
                      const isSelected = Boolean(
                        selectedCell &&
                        ((selectedCell.colA === rowName && selectedCell.colB === colName) ||
                          (selectedCell.colA === colName && selectedCell.colB === rowName))
                      );

                      const rVal = cell ? cell.r : 0;
                      const absR = Math.abs(rVal);
                      const isFilteredOut = minThreshold > 0 && absR < minThreshold && !isDiagonal;

                      const colors = isDiagonal
                        ? {
                            backgroundColor: '#f1f5f9',
                            textColor: '#64748b',
                            borderColor: '#e2e8f0',
                            accentBg: '#e2e8f0',
                          }
                        : getCorrelationColor(rVal, isSelected);

                      return (
                        <td
                          key={colName}
                          onMouseEnter={() => setHoveredCell({ row: rowName, col: colName })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            if (cell) setSelectedCell(cell);
                          }}
                          style={{
                            backgroundColor: isFilteredOut ? '#fcfcfc' : colors.backgroundColor,
                            color: isFilteredOut ? '#94a3b8' : colors.textColor,
                            opacity: isFilteredOut ? 0.35 : 1,
                          }}
                          className={`p-2 text-center border border-stone-200/90 font-mono transition-all cursor-pointer relative ${
                            isSelected
                              ? 'ring-2 ring-indigo-600 ring-offset-1 z-10 font-bold shadow-md'
                              : 'hover:brightness-95'
                          }`}
                          title={`${rowName} vs ${colName}: r = ${rVal > 0 ? '+' : ''}${rVal.toFixed(
                            3
                          )} (${cell?.strengthLabel || ''})`}
                        >
                          <div className="flex flex-col items-center justify-center py-1">
                            <span className="text-[12px] font-bold tracking-tight">
                              {isDiagonal ? '1.00' : `${rVal >= 0 ? '+' : ''}${rVal.toFixed(2)}`}
                            </span>
                            {!isDiagonal && (
                              <span className="text-[9px] font-sans opacity-85 leading-none mt-0.5">
                                {cell?.strengthLabel.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Pair Relationship Inspector & Scatter Preview */}
      {selectedCell && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-stone-100 text-stone-700">
                Detailed Pair Inspection
              </span>
              <h4 className="text-sm font-bold text-stone-900">
                <span className="text-indigo-600">{selectedCell.colA}</span>
                <span className="text-stone-400 font-normal mx-1.5">↔</span>
                <span className="text-indigo-600">{selectedCell.colB}</span>
              </h4>
            </div>

            {/* Quick action to plot as Scatter Chart */}
            {onSwitchToScatter && selectedCell.colA !== selectedCell.colB && (
              <button
                type="button"
                id="corr-switch-scatter-btn"
                onClick={() => onSwitchToScatter(selectedCell.colA, selectedCell.colB)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer group"
                title={`Open Scatter Chart with X = ${selectedCell.colA} and Y = ${selectedCell.colB}`}
              >
                <ScatterIcon className="w-3.5 h-3.5" />
                <span>Plot Scatter Chart</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Metric 1: Pearson r */}
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                Pearson Correlation (r)
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold font-mono ${
                    selectedCell.r > 0 ? 'text-indigo-600' : selectedCell.r < 0 ? 'text-rose-600' : 'text-stone-700'
                  }`}
                >
                  {selectedCell.r >= 0 ? '+' : ''}
                  {selectedCell.r.toFixed(3)}
                </span>
                <span className="text-xs font-semibold text-stone-600">
                  {selectedCell.strengthLabel}
                </span>
              </div>
            </div>

            {/* Metric 2: R-Squared */}
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                R² (Variance Explained)
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-stone-900">
                  {(selectedCell.rSquared * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-stone-500">
                  (R² = {selectedCell.rSquared.toFixed(3)})
                </span>
              </div>
            </div>

            {/* Metric 3: Sample Size & Significance */}
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                Sample Size & Confidence
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-stone-900">
                  N = {selectedCell.sampleSize}
                </span>
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    selectedCell.isSignificant
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {selectedCell.isSignificant ? 'p < 0.05 (Sig.)' : 'p ≥ 0.05'}
                </span>
              </div>
            </div>

            {/* Metric 4: Relationship Interpretation */}
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 flex flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Analytical Interpretation
              </div>
              <p className="text-xs text-stone-700 leading-snug">
                {selectedCell.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
