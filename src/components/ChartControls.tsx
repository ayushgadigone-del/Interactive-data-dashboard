import React from 'react';
import { 
  BarChart2, 
  LineChart, 
  AreaChart as AreaChartIcon, 
  PieChart as PieChartIcon, 
  ScatterChart, 
  Radar, 
  Layers, 
  Grid3X3, 
  Table, 
  Palette, 
  Sliders, 
  Check,
  RotateCcw,
  Pipette,
  TrendingUp,
  Network
} from 'lucide-react';
import { ChartType, ColumnMetadata, DashboardConfig, ColorPalette, DataRow } from '../types';
import { COLOR_PALETTES } from '../data/sampleDatasets';

interface ChartControlsProps {
  config: DashboardConfig;
  columns: ColumnMetadata[];
  seriesKeys?: string[];
  chartData?: DataRow[];
  onChangeConfig: (newConfig: Partial<DashboardConfig>) => void;
  className?: string;
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  config,
  columns,
  seriesKeys = [],
  chartData = [],
  onChangeConfig,
  className = '',
}) => {
  const numericColumns = columns.filter((c) => c.type === 'number');
  const categoricalColumns = columns.filter((c) => c.type === 'string' || c.type === 'date' || c.type === 'boolean');

  const chartTypes: { type: ChartType; label: string; icon: React.ReactNode; desc: string }[] = [
    { type: 'bar', label: 'Bar Chart', icon: <BarChart2 className="w-4 h-4" />, desc: 'Compare categories' },
    { type: 'line', label: 'Line Trend', icon: <LineChart className="w-4 h-4" />, desc: 'Trends over time' },
    { type: 'area', label: 'Area Chart', icon: <AreaChartIcon className="w-4 h-4" />, desc: 'Volume & cumulative flow' },
    { type: 'pie', label: 'Donut / Pie', icon: <PieChartIcon className="w-4 h-4" />, desc: 'Share & proportions' },
    { type: 'composed', label: 'Combo (Bar+Line)', icon: <Layers className="w-4 h-4" />, desc: 'Multi-scale comparison' },
    { type: 'scatter', label: 'Scatter Plot', icon: <ScatterChart className="w-4 h-4" />, desc: 'Correlation analysis' },
    { type: 'radar', label: 'Radar / Spider', icon: <Radar className="w-4 h-4" />, desc: 'Multi-variable footprint' },
    { type: 'heatmap', label: 'Heatmap Matrix', icon: <Grid3X3 className="w-4 h-4" />, desc: '2D grid intensity' },
    { type: 'correlation', label: 'Correlation Heatmap', icon: <Network className="w-4 h-4" />, desc: 'Metric relationships (r)' },
    { type: 'table', label: 'Data Table', icon: <Table className="w-4 h-4" />, desc: 'Raw records explorer' },
  ];

  const currentPalette =
    COLOR_PALETTES.find((p) => p.id === config.paletteId) || COLOR_PALETTES[0];
  const paletteColors = currentPalette.colors;

  const quickSwatches = [
    '#4f46e5', '#2563eb', '#0284c7', '#06b6d4',
    '#10b981', '#84cc16', '#eab308', '#f97316',
    '#ef4444', '#ec4899', '#8b5cf6', '#64748b'
  ];

  const customizableSeries: string[] = React.useMemo(() => {
    if (config.chartType === 'heatmap' || config.chartType === 'table' || config.chartType === 'correlation') {
      return [];
    }
    if (config.chartType === 'pie') {
      if (chartData && chartData.length > 0) {
        return Array.from(
          new Set(
            chartData
              .map((d) => String(d[config.xAxisKey] ?? ''))
              .filter(Boolean)
          )
        );
      }
    }
    if (config.chartType === 'scatter') {
      return config.yAxisKeys.slice(0, 1);
    }
    if (seriesKeys && seriesKeys.length > 0) {
      return seriesKeys;
    }
    return config.yAxisKeys;
  }, [config.chartType, config.xAxisKey, config.yAxisKeys, seriesKeys, chartData]);

  const activeOverrides = config.customSeriesColors || {};
  const overrideCount = Object.keys(activeOverrides).filter((k) =>
    customizableSeries.includes(k)
  ).length;

  const handleSeriesColorChange = (seriesName: string, hexColor: string) => {
    onChangeConfig({
      customSeriesColors: {
        ...(config.customSeriesColors || {}),
        [seriesName]: hexColor,
      },
    });
  };

  const handleResetSeriesColor = (seriesName: string) => {
    const updated = { ...(config.customSeriesColors || {}) };
    delete updated[seriesName];
    onChangeConfig({ customSeriesColors: updated });
  };

  const handleResetAllSeriesColors = () => {
    onChangeConfig({ customSeriesColors: {} });
  };

  const handleYAxisToggle = (colName: string) => {
    let next: string[];
    if (config.yAxisKeys.includes(colName)) {
      if (config.yAxisKeys.length > 1) {
        next = config.yAxisKeys.filter((k) => k !== colName);
      } else {
        next = config.yAxisKeys;
      }
    } else {
      next = [...config.yAxisKeys, colName];
    }
    onChangeConfig({ yAxisKeys: next });
  };

  return (
    <div className={`space-y-4 text-xs ${className}`}>
      {/* 1. Chart Type Selector (Visual Grid) */}
      <div>
        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
          Visualization Type
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {chartTypes.map((item) => {
            const isSelected = config.chartType === item.type;
            return (
              <button
                key={item.type}
                id={`chart-type-${item.type}-btn`}
                onClick={() => onChangeConfig({ chartType: item.type })}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-semibold shadow-xs'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                <div className={`${isSelected ? 'text-indigo-600' : 'text-stone-500'} mb-1`}>
                  {item.icon}
                </div>
                <span className="text-[11px] leading-tight font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional Configuration based on chart type */}
      {config.chartType === 'heatmap' ? (
        <div className="space-y-3 bg-stone-50/70 p-3 rounded-xl border border-stone-200/80">
          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
              Row Dimension (Y-Axis)
            </label>
            <select
              id="heatmap-row-select"
              value={config.heatmapRowKey || categoricalColumns[0]?.name || ''}
              onChange={(e) => onChangeConfig({ heatmapRowKey: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
              Column Dimension (X-Axis)
            </label>
            <select
              id="heatmap-col-select"
              value={config.heatmapColKey || categoricalColumns[1]?.name || ''}
              onChange={(e) => onChangeConfig({ heatmapColKey: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
              Cell Metric (Value)
            </label>
            <select
              id="heatmap-val-select"
              value={config.heatmapValKey || numericColumns[0]?.name || ''}
              onChange={(e) => onChangeConfig({ heatmapValKey: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
            >
              {numericColumns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : config.chartType === 'correlation' ? (
        <div className="space-y-2.5 bg-indigo-50/70 p-3 rounded-xl border border-indigo-200/80 text-[11px]">
          <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
            <Network className="w-4 h-4 text-indigo-600" />
            <span>Correlation Analysis</span>
          </div>
          <p className="text-stone-700 leading-snug">
            Automatically computes Pearson correlation coefficients (r) between all <strong>{numericColumns.length}</strong> numeric columns.
          </p>
          <div className="pt-1.5 border-t border-indigo-200/60 text-stone-600">
            <span className="font-semibold text-indigo-900">Analyzed Metrics:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {numericColumns.map((col) => (
                <span
                  key={col.name}
                  className="px-1.5 py-0.5 rounded bg-white text-indigo-900 font-mono text-[10px] border border-indigo-200"
                >
                  {col.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : config.chartType === 'table' ? (
        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-stone-500 text-[11px]">
          Table explorer mode active. Use search, sort headers, and column filters in the main view.
        </div>
      ) : (
        <div className="space-y-3 bg-stone-50/70 p-3 rounded-xl border border-stone-200/80">
          {/* X Axis Dimension */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
              Primary Dimension (X-Axis)
            </label>
            <select
              id="config-x-axis-select"
              value={config.xAxisKey}
              onChange={(e) => onChangeConfig({ xAxisKey: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} {col.type === 'number' ? '(123)' : '(Text)'}
                </option>
              ))}
            </select>
          </div>

          {/* Y Axis Metrics (Multi-choice chips) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-stone-700">
                Metrics to Measure (Y-Axis)
              </label>
              <span className="text-[10px] text-stone-500">
                {config.yAxisKeys.length} selected
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 bg-white p-1.5 rounded-lg border border-stone-200">
              {numericColumns.length > 0 ? (
                numericColumns.map((col) => {
                  const isSelected = config.yAxisKeys.includes(col.name);
                  return (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => handleYAxisToggle(col.name)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="truncate">{col.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  );
                })
              ) : (
                <div className="text-stone-600 text-[11px] p-2">
                  No numeric columns detected. Showing all fields:
                  {columns.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleYAxisToggle(c.name)}
                      className="block w-full text-left p-1 text-xs text-stone-700 hover:bg-stone-100"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aggregation Function */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
              Aggregation Method
            </label>
            <div className="grid grid-cols-5 gap-1">
              {(['sum', 'avg', 'count', 'min', 'max'] as const).map((agg) => (
                <button
                  key={agg}
                  id={`agg-${agg}-btn`}
                  onClick={() => onChangeConfig({ aggregation: agg })}
                  className={`py-1 text-[11px] rounded border uppercase font-mono font-medium transition-colors ${
                    config.aggregation === agg
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {agg}
                </button>
              ))}
            </div>
          </div>

          {/* Group By / Breakdown series (optional) */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
              Breakdown / Group By (Optional)
            </label>
            <select
              id="config-group-by-select"
              value={config.groupByKey || ''}
              onChange={(e) => onChangeConfig({ groupByKey: e.target.value || undefined })}
              className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none"
            >
              <option value="">(None - aggregate by X-Axis only)</option>
              {categoricalColumns
                .filter((c) => c.name !== config.xAxisKey)
                .map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.uniqueValuesCount} groups)
                  </option>
                ))}
            </select>
          </div>

          {/* Secondary Metric for Composed chart */}
          {config.chartType === 'composed' && (
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Line Metric (Secondary Axis)
              </label>
              <select
                id="composed-secondary-select"
                value={config.secondaryMetricKey || numericColumns[1]?.name || ''}
                onChange={(e) => onChangeConfig({ secondaryMetricKey: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800"
              >
                {numericColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bar specific options */}
          {config.chartType === 'bar' && (
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.isStacked}
                  onChange={(e) => onChangeConfig({ isStacked: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span className="text-[11px] text-stone-700">Stacked Bars</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.isHorizontal}
                  onChange={(e) => onChangeConfig({ isHorizontal: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span className="text-[11px] text-stone-700">Horizontal</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Color Palette Selector */}
      {config.chartType === 'correlation' ? (
        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-[11px] space-y-1.5">
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Color Scale (Divergent)
          </label>
          <p className="text-stone-600">
            Standard statistical divergent palette:
          </p>
          <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono">
            <span className="text-rose-700 font-bold">-1.0 (Inverse)</span>
            <span className="text-stone-600">0.0 (Neutral)</span>
            <span className="text-indigo-700 font-bold">+1.0 (Positive)</span>
          </div>
          <div className="h-3 rounded-md flex overflow-hidden border border-stone-200">
            <div className="flex-1 bg-rose-600" />
            <div className="flex-1 bg-rose-300" />
            <div className="flex-1 bg-stone-100" />
            <div className="flex-1 bg-indigo-300" />
            <div className="flex-1 bg-indigo-600" />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
            Color Scheme
          </label>
          <div className="space-y-1.5">
            {COLOR_PALETTES.map((pal) => {
              const isSelected = config.paletteId === pal.id;
              return (
                <button
                  key={pal.id}
                  onClick={() => onChangeConfig({ paletteId: pal.id })}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-50/60 border-indigo-500 shadow-xs'
                      : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span className={`text-[11px] font-medium ${isSelected ? 'text-indigo-900' : 'text-stone-700'}`}>
                    {pal.name}
                  </span>
                  <div className="flex items-center gap-1">
                    {pal.colors.slice(0, 5).map((color, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Series Color Overrides & Custom Palette Picker */}
      {customizableSeries.length > 0 && (
        <div className="pt-3 border-t border-stone-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Pipette className="w-3.5 h-3.5 text-indigo-600" />
              <label className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
                Series Colors Override
              </label>
            </div>
            {overrideCount > 0 && (
              <button
                type="button"
                id="reset-all-series-colors-btn"
                onClick={handleResetAllSeriesColors}
                className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 transition-colors font-medium cursor-pointer"
                title="Reset all series to theme palette defaults"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset all ({overrideCount})
              </button>
            )}
          </div>

          <p className="text-[11px] text-stone-500">
            Pick custom colors for each active series or slice to manually override the theme.
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {customizableSeries.map((seriesName, idx) => {
              const defaultColor = paletteColors[idx % paletteColors.length];
              const isOverridden = Boolean(activeOverrides[seriesName]);
              const currentColor = activeOverrides[seriesName] || defaultColor;

              return (
                <div
                  key={seriesName}
                  className={`p-2 rounded-lg border transition-all ${
                    isOverridden
                      ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Interactive Color Input button */}
                      <label
                        className="relative cursor-pointer w-6 h-6 rounded-md border border-stone-300 shadow-2xs shrink-0 overflow-hidden flex items-center justify-center hover:scale-105 transition-transform"
                        style={{ backgroundColor: currentColor }}
                        title={`Choose color for ${seriesName}`}
                      >
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => handleSeriesColorChange(seriesName, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                      <span className="text-xs font-semibold text-stone-800 truncate" title={seriesName}>
                        {seriesName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[10px] text-stone-500 uppercase bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/80">
                        {currentColor}
                      </span>
                      {isOverridden ? (
                        <button
                          type="button"
                          onClick={() => handleResetSeriesColor(seriesName)}
                          className="text-stone-400 hover:text-stone-700 p-1 rounded hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Reset this series to theme default"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 px-1 font-medium">Theme</span>
                      )}
                    </div>
                  </div>

                  {/* Quick swatches row for fast customization */}
                  <div className="flex items-center gap-1 pt-1 border-t border-stone-100 overflow-x-auto py-0.5">
                    <span className="text-[10px] text-stone-400 mr-0.5">Presets:</span>
                    {quickSwatches.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleSeriesColorChange(seriesName, color)}
                        className={`w-3.5 h-3.5 rounded-full shrink-0 border transition-transform cursor-pointer ${
                          currentColor.toLowerCase() === color.toLowerCase()
                            ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110 border-white'
                            : 'border-black/10 hover:scale-115'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trend Line Analysis (for Line & Scatter charts) */}
      {(config.chartType === 'line' || config.chartType === 'scatter') && (
        <div className="pt-2 border-t border-stone-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Trend Analysis
              </label>
            </div>
            <span className="text-[10px] text-stone-500 font-medium bg-stone-100 px-1.5 py-0.5 rounded">
              Time-Series
            </span>
          </div>

          <label className="flex items-center justify-between p-2 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer select-none bg-white">
            <span className="text-[11px] font-medium text-stone-800">Auto Trend Overlay</span>
            <input
              type="checkbox"
              checked={config.showTrendLine !== false}
              onChange={(e) => onChangeConfig({ showTrendLine: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
            />
          </label>

          {config.showTrendLine !== false && (
            <div className="space-y-1.5 pl-0.5">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                Regression Curve
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeConfig({ trendLineModel: 'linear' })}
                  className={`px-2 py-1.5 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer ${
                    (config.trendLineModel || 'linear') === 'linear'
                      ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-semibold text-xs">Linear (1°)</div>
                  <div className="text-[9px] text-stone-500 font-mono">y = mx + c</div>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeConfig({ trendLineModel: 'polynomial' })}
                  className={`px-2 py-1.5 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer ${
                    config.trendLineModel === 'polynomial'
                      ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-semibold text-xs">Polynomial (2°)</div>
                  <div className="text-[9px] text-stone-500 font-mono">y = ax² + bx + c</div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Display Toggles */}
      <div className="pt-2 border-t border-stone-200">
        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
          Display Settings
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.showGrid}
              onChange={(e) => onChangeConfig({ showGrid: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span className="text-[11px] text-stone-700">Grid Lines</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.showLegend}
              onChange={(e) => onChangeConfig({ showLegend: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span className="text-[11px] text-stone-700">Legend</span>
          </label>
        </div>
      </div>
    </div>
  );
};
