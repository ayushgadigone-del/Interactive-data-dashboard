import React, { useState, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ZAxis,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Sparkles, 
  ArrowLeft, 
  X, 
  MousePointerClick,
  MoveHorizontal 
} from 'lucide-react';
import { ColumnMetadata, DashboardConfig, DataRow, SelectedCategoryFilter } from '../types';
import { COLOR_PALETTES } from '../data/sampleDatasets';
import { HorizontalSlider } from './HorizontalSlider';
import { HeatmapMatrix } from './HeatmapMatrix';
import { CorrelationHeatmap } from './CorrelationHeatmap';
import { DataTable } from './DataTable';
import {
  isTimeSeries,
  computeSeriesTrendLines,
  computeScatterTrendLine,
  TrendLineModel,
} from '../utils/trendLine';

interface ChartContainerProps {
  config: DashboardConfig;
  data: DataRow[];
  chartData: DataRow[];
  seriesKeys: string[];
  columns: ColumnMetadata[];
  datasetName: string;
  onChangeConfig?: (newConfig: Partial<DashboardConfig>) => void;
  selectedCategory?: SelectedCategoryFilter | null;
  onSelectCategory?: (category: SelectedCategoryFilter) => void;
  onResetCategory?: () => void;
  onDeleteRows?: (rows: DataRow[]) => void;
  handleDeleteRows?: (rows: DataRow[]) => void;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  config,
  data,
  chartData,
  seriesKeys,
  columns,
  datasetName,
  onChangeConfig,
  selectedCategory,
  onSelectCategory,
  onResetCategory,
  onDeleteRows,
  handleDeleteRows: propHandleDeleteRows,
}) => {
  const currentPalette =
    COLOR_PALETTES.find((p) => p.id === config.paletteId) || COLOR_PALETTES[0];
  const colors = currentPalette.colors;

  const [wideChartView, setWideChartView] = useState<boolean>(() => chartData.length > 8);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const isScrollableType = config.chartType !== 'pie' && config.chartType !== 'radar' && !config.isHorizontal;

  // Helper to get series color, with priority to custom series overrides
  const getSeriesColor = (key: string, defaultIdx: number): string => {
    if (config.customSeriesColors && config.customSeriesColors[key]) {
      return config.customSeriesColors[key];
    }
    return colors[defaultIdx % colors.length];
  };

  // Custom Formatter for numbers
  const formatAxisTick = (val: any) => {
    if (typeof val === 'number') {
      if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
      if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
      return val.toLocaleString();
    }
    return String(val);
  };

  // Detect if current X-axis represents time-series/temporal data
  const xCol = columns.find((c) => c.name === config.xAxisKey);
  const isTimeSeriesData = React.useMemo(() => {
    return isTimeSeries(xCol, chartData.map((d) => d[config.xAxisKey]));
  }, [xCol, chartData, config.xAxisKey]);

  const isScatterTimeSeries = React.useMemo(() => {
    if (config.chartType !== 'scatter') return false;
    return isTimeSeries(xCol, data.slice(0, 40).map((d) => d[config.xAxisKey]));
  }, [xCol, data, config.chartType, config.xAxisKey]);

  const isTemporal = isTimeSeriesData || isScatterTimeSeries;

  // Trendline eligibility: Line or Scatter chart with temporal data
  const isTrendLineEligible =
    (config.chartType === 'line' || config.chartType === 'scatter') && isTemporal;
  
  // Default to enabled (automatic overlay) when eligible, unless explicitly turned off
  const isTrendLineActive = isTrendLineEligible && (config.showTrendLine !== false);
  const trendModel: TrendLineModel = config.trendLineModel || 'linear';
  const polynomialDegree = config.polynomialDegree || 2;

  // Compute trend lines for Line Chart
  const { trendResults, augmentedChartData } = React.useMemo(() => {
    if (!isTrendLineActive || config.chartType !== 'line') {
      return { trendResults: {}, augmentedChartData: chartData };
    }
    return computeSeriesTrendLines(
      chartData,
      config.xAxisKey,
      seriesKeys,
      trendModel,
      polynomialDegree
    );
  }, [isTrendLineActive, config.chartType, chartData, config.xAxisKey, seriesKeys, trendModel, polynomialDegree]);

  // Compute trend line for Scatter Chart
  const { trendResult: scatterTrend, trendPoints: scatterTrendPoints } = React.useMemo(() => {
    if (!isTrendLineActive || config.chartType !== 'scatter') {
      return { trendResult: null, trendPoints: [] };
    }
    return computeScatterTrendLine(
      data,
      config.xAxisKey,
      config.yAxisKeys[0] || 'Value',
      trendModel,
      polynomialDegree
    );
  }, [isTrendLineActive, config.chartType, data, config.xAxisKey, config.yAxisKeys, trendModel, polynomialDegree]);

  // Primary trend summary for the header badge
  const primaryTrend =
    config.chartType === 'scatter'
      ? scatterTrend
      : Object.values(trendResults)[0] || null;

  // Handler for category click drill-down
  const handleCategoryClick = (val: any) => {
    if (val === undefined || val === null) return;
    onSelectCategory?.({
      columnKey: config.xAxisKey,
      value: val,
    });
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white/95 backdrop-blur-xs border border-stone-200 rounded-xl shadow-lg p-3 text-xs max-w-xs z-50">
        <div className="font-semibold text-stone-900 border-b border-stone-100 pb-1 mb-2 flex items-center justify-between gap-2">
          <span>{label ?? payload[0]?.payload?.[config.xAxisKey] ?? 'Metric Value'}</span>
          {isTrendLineActive && (
            <span className="text-[10px] text-indigo-600 bg-indigo-50 font-normal px-1.5 py-0.5 rounded">
              Trend Active
            </span>
          )}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const val = entry.value;
            const formattedVal =
              typeof val === 'number'
                ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : val;
            const isTrendEntry =
              String(entry.name).toLowerCase().includes('trend') ||
              String(entry.dataKey).startsWith('_trend_') ||
              entry.payload?._isTrendLine;

            return (
              <div
                key={`tooltip-${index}`}
                className={`flex items-center justify-between gap-4 ${
                  isTrendEntry ? 'pt-0.5 text-stone-600' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isTrendEntry ? (
                    <span
                      className="w-3 h-0.5 border-t-2 border-dashed shrink-0"
                      style={{ borderColor: entry.color || entry.stroke || '#6366f1' }}
                    />
                  ) : (
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: entry.color || entry.fill }}
                    />
                  )}
                  <span
                    className={`truncate ${
                      isTrendEntry ? 'italic text-stone-500 font-medium' : 'text-stone-700'
                    }`}
                  >
                    {entry.name}:
                  </span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    isTrendEntry ? 'text-indigo-600' : 'text-stone-900'
                  }`}
                >
                  {formattedVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (config.chartType === 'table') {
    return (
      <DataTable
        data={data}
        columns={columns}
        datasetName={datasetName}
        onDeleteRows={onDeleteRows || propHandleDeleteRows}
        handleDeleteRows={propHandleDeleteRows || onDeleteRows}
      />
    );
  }

  if (config.chartType === 'correlation') {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Correlation Heatmap Matrix</h3>
            <p className="text-xs text-stone-500">
              Pairwise Pearson correlation coefficients (r) across all numeric metrics to identify direct and inverse relationships
            </p>
          </div>
        </div>
        <CorrelationHeatmap
          data={data}
          columns={columns}
          datasetName={datasetName}
          onSwitchToScatter={(xAxisKey, yAxisKey) => {
            onChangeConfig?.({
              chartType: 'scatter',
              xAxisKey,
              yAxisKeys: [yAxisKey],
            });
          }}
        />
      </div>
    );
  }

  if (config.chartType === 'heatmap') {
    const rowKey = config.heatmapRowKey || columns.find((c) => c.type === 'string')?.name || columns[0]?.name;
    const colKey = config.heatmapColKey || columns.find((c) => c.type === 'string' && c.name !== rowKey)?.name || columns[1]?.name;
    const valKey = config.heatmapValKey || columns.find((c) => c.type === 'number')?.name || columns[0]?.name;

    return (
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Intensity Matrix</h3>
            <p className="text-xs text-stone-500">
              Cross-tabulation of <span className="font-medium text-stone-800">{rowKey}</span> vs{' '}
              <span className="font-medium text-stone-800">{colKey}</span> weighted by{' '}
              <span className="font-medium text-stone-800">{valKey}</span>
            </p>
          </div>
        </div>
        <HeatmapMatrix
          data={data}
          columns={columns}
          rowKey={rowKey}
          colKey={colKey}
          valKey={valKey}
        />
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-stone-500">
        <p className="text-sm font-medium">No data available to plot with current dimensions.</p>
        <p className="text-xs text-stone-600 mt-1">
          Adjust X-Axis or Y-Axis choices from the configuration panel on the left.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex flex-col min-h-[440px]">
      {/* Chart Title and Specs */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-stone-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-stone-900 capitalize">
            {config.chartType === 'composed'
              ? 'Multi-Metric Comparison'
              : `${config.chartType} Chart View`}
          </h3>
          <p className="text-xs text-stone-500">
            Plotting <span className="font-semibold text-stone-700">{config.yAxisKeys.join(', ')}</span> by{' '}
            <span className="font-semibold text-stone-700">{config.xAxisKey}</span> ({config.aggregation.toUpperCase()})
            {config.groupByKey && (
              <span> · segmented by <strong className="text-stone-700">{config.groupByKey}</strong></span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Horizontal Slider Mode Toggle */}
          {isScrollableType && chartData.length > 5 && (
            <button
              type="button"
              id="toggle-chart-slider-view-btn"
              onClick={() => setWideChartView(!wideChartView)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                wideChartView
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-2xs'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
              title={wideChartView ? 'Fit chart to standard screen width' : 'Expand chart with horizontal slider for easier viewing on PC & mobile'}
            >
              <MoveHorizontal className="w-3.5 h-3.5" />
              <span>{wideChartView ? 'Horizontal Slider' : 'Wide Slider'}</span>
            </button>
          )}

          {/* Automatic Trend Line Overlay Controls (for time-series line or scatter charts) */}
          {isTrendLineEligible && (
          <div className="flex items-center gap-2 flex-wrap text-xs bg-stone-50 border border-stone-200 rounded-lg p-1.5 shadow-2xs">
            {/* Toggle Active Button */}
            <button
              type="button"
              id="trendline-toggle-btn"
              onClick={() => onChangeConfig?.({ showTrendLine: !isTrendLineActive })}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                isTrendLineActive
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
              }`}
              title={isTrendLineActive ? 'Click to hide trend line overlay' : 'Click to overlay automatically calculated trend line'}
            >
              {primaryTrend?.direction === 'down' ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              <span>Trend Line</span>
              <span
                className={`text-[9px] font-bold px-1 py-0.2 rounded uppercase ${
                  isTrendLineActive ? 'bg-indigo-700 text-white' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {isTrendLineActive ? 'ON' : 'OFF'}
              </span>
            </button>

            {isTrendLineActive && (
              <>
                {/* Model Selector: Linear vs Polynomial */}
                <div className="flex items-center bg-white border border-stone-200 rounded-md p-0.5 shadow-2xs">
                  <button
                    type="button"
                    id="trendline-model-linear"
                    onClick={() => onChangeConfig?.({ trendLineModel: 'linear' })}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      trendModel === 'linear'
                        ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    title="Linear Regression: y = mx + c"
                  >
                    Linear (1°)
                  </button>
                  <button
                    type="button"
                    id="trendline-model-poly"
                    onClick={() => onChangeConfig?.({ trendLineModel: 'polynomial' })}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      trendModel === 'polynomial'
                        ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    title="Polynomial Regression (Quadratic): y = ax² + bx + c"
                  >
                    Polynomial (2°)
                  </button>
                </div>

                {/* Primary Trend Equation & R² Badge */}
                {primaryTrend && (
                  <div
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[11px] shadow-2xs"
                    title={`Regression Formula: ${primaryTrend.equation} (Goodness of fit R² = ${primaryTrend.rSquared.toFixed(3)})`}
                  >
                    <span className="font-mono text-[10px] text-stone-600 truncate max-w-[160px]">
                      {primaryTrend.equation}
                    </span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-mono text-[10px]">
                      {primaryTrend.rSquaredFormatted}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Drill-Down Active Filter Status Banner with 'Back' Button */}
      {selectedCategory ? (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 flex-wrap shadow-2xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              id="chart-drilldown-back-btn"
              onClick={onResetCategory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer group"
              title="Reset drill-down category and return to full overview"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back (Reset Filter)</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-stone-700">
              <span className="text-stone-500 font-medium">Category isolated:</span>
              <span className="font-bold text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                {selectedCategory.columnKey}: "{String(selectedCategory.value)}"
              </span>
              <span className="text-indigo-700 font-semibold bg-indigo-100/80 px-2 py-0.5 rounded-full text-[11px]">
                {data.filter((r) => String(r[selectedCategory.columnKey]) === String(selectedCategory.value)).length} detail {data.filter((r) => String(r[selectedCategory.columnKey]) === String(selectedCategory.value)).length === 1 ? 'row' : 'rows'}
              </span>
            </div>
          </div>

          <button
            type="button"
            id="chart-drilldown-reset-x-btn"
            onClick={onResetCategory}
            className="text-stone-500 hover:text-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer px-2 py-1 rounded hover:bg-white/60 transition-colors"
            title="Reset filter"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between text-[11px] text-stone-500 bg-stone-50 border border-stone-150 px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              Click any <strong>bar</strong>, <strong>pie slice</strong>, or <strong>data point</strong> to drill down into detail-level rows.
            </span>
          </div>
          <span className="text-[10px] text-stone-600 font-medium hidden sm:inline">Interactive drill-down active</span>
        </div>
      )}

      {/* Horizontal Slider for wide charts */}
      {isScrollableType && (
        <div className="mb-2">
          <HorizontalSlider
            targetRef={chartScrollRef}
            label="Chart Categories Slider"
            stepAmount={180}
          />
        </div>
      )}

      {/* Render selected chart */}
      <div 
        ref={chartScrollRef}
        className="w-full flex-1 min-h-[360px] overflow-x-auto scroll-smooth"
      >
        <div 
          style={{ 
            minWidth: isScrollableType && (wideChartView || chartData.length > 8) 
              ? Math.max(620, chartData.length * 50) 
              : '100%', 
            height: 380 
          }}
        >
          <ResponsiveContainer width="100%" height={380}>
          {(() => {
            switch (config.chartType) {
              case 'bar':
                return (
                  <BarChart
                    data={chartData}
                    layout={config.isHorizontal ? 'vertical' : 'horizontal'}
                    margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
                    onClick={(state: any) => {
                      if (state && state.activeLabel !== undefined) {
                        handleCategoryClick(state.activeLabel);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {config.showGrid && (
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    )}
                    {config.isHorizontal ? (
                      <>
                        <XAxis type="number" tickFormatter={formatAxisTick} stroke="#94a3b8" fontSize={11} />
                        <YAxis dataKey={config.xAxisKey} type="category" stroke="#94a3b8" fontSize={11} width={90} />
                      </>
                    ) : (
                      <>
                        <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis tickFormatter={formatAxisTick} stroke="#94a3b8" fontSize={11} tickLine={false} />
                      </>
                    )}
                    <Tooltip content={<CustomTooltip />} />
                    {config.showLegend && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />}
                    {seriesKeys.map((key, idx) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill={getSeriesColor(key, idx)}
                        stackId={config.isStacked ? 'stack' : undefined}
                        radius={config.isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                        className="cursor-pointer"
                        onClick={(entry: any) => {
                          const cat = entry?.[config.xAxisKey] ?? entry?.payload?.[config.xAxisKey];
                          if (cat !== undefined) handleCategoryClick(cat);
                        }}
                      >
                        {chartData.map((entry, cIdx) => {
                          const catVal = entry[config.xAxisKey];
                          const isSelected = selectedCategory && String(selectedCategory.value) === String(catVal);
                          const isDimmed = selectedCategory && !isSelected;
                          return (
                            <Cell
                              key={`cell-bar-${key}-${cIdx}`}
                              fill={getSeriesColor(key, idx)}
                              opacity={isDimmed ? 0.35 : 1}
                              className="cursor-pointer transition-opacity duration-150"
                            />
                          );
                        })}
                      </Bar>
                    ))}
                  </BarChart>
                );

              case 'line':
                return (
                  <LineChart
                    data={isTrendLineActive ? augmentedChartData : chartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
                    onClick={(state: any) => {
                      if (state && state.activeLabel !== undefined) {
                        handleCategoryClick(state.activeLabel);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {config.showGrid && (
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    )}
                    <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis tickFormatter={formatAxisTick} stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    {config.showLegend && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />}
                    {/* Actual data lines */}
                    {seriesKeys.map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={getSeriesColor(key, idx)}
                        strokeWidth={2.5}
                        dot={{ r: 3.5, strokeWidth: 1.5, fill: '#ffffff', cursor: 'pointer' }}
                        activeDot={{
                          r: 6,
                          cursor: 'pointer',
                          onClick: (_: any, payload: any) =>
                            handleCategoryClick(payload?.payload?.[config.xAxisKey]),
                        }}
                      />
                    ))}
                    {/* Calculated Trend Lines Overlay */}
                    {isTrendLineActive &&
                      seriesKeys.map((key, idx) => {
                        const trend = trendResults[key];
                        if (!trend) return null;
                        const sColor = getSeriesColor(key, idx);
                        return (
                          <Line
                            key={`trend-${key}`}
                            type="monotone"
                            dataKey={trend.trendDataKey}
                            name={`Trend (${key}): ${trend.rSquaredFormatted}`}
                            stroke={sColor}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        );
                      })}
                  </LineChart>
                );

              case 'area':
                return (
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
                    onClick={(state: any) => {
                      if (state && state.activeLabel !== undefined) {
                        handleCategoryClick(state.activeLabel);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <defs>
                      {seriesKeys.map((key, idx) => {
                        const sColor = getSeriesColor(key, idx);
                        return (
                          <linearGradient key={`grad-${key}`} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={sColor} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={sColor} stopOpacity={0.0} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    {config.showGrid && (
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    )}
                    <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis tickFormatter={formatAxisTick} stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    {config.showLegend && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />}
                    {seriesKeys.map((key, idx) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={getSeriesColor(key, idx)}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#grad-${idx})`}
                        stackId={config.isStacked ? '1' : undefined}
                        activeDot={{
                          r: 6,
                          cursor: 'pointer',
                          onClick: (_: any, payload: any) =>
                            handleCategoryClick(payload?.payload?.[config.xAxisKey]),
                        }}
                      />
                    ))}
                  </AreaChart>
                );

              case 'pie':
                {
                  const pieMetric = seriesKeys[0] || config.yAxisKeys[0];
                  return (
                    <PieChart margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <Tooltip content={<CustomTooltip />} />
                      {config.showLegend && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                      <Pie
                        data={chartData}
                        dataKey={pieMetric}
                        nameKey={config.xAxisKey}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                        className="cursor-pointer"
                        onClick={(entry: any) => {
                          const cat = entry?.[config.xAxisKey] ?? entry?.name ?? entry?.payload?.[config.xAxisKey];
                          if (cat !== undefined) handleCategoryClick(cat);
                        }}
                      >
                        {chartData.map((item, index) => {
                          const sliceLabel = String(item[config.xAxisKey] ?? `Slice ${index + 1}`);
                          const isSelected = selectedCategory && String(selectedCategory.value) === sliceLabel;
                          const isDimmed = selectedCategory && !isSelected;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={getSeriesColor(sliceLabel, index)}
                              opacity={isDimmed ? 0.35 : 1}
                              className="cursor-pointer transition-opacity duration-150"
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  );
                }

              case 'scatter':
                {
                  const xKey = config.xAxisKey;
                  const yKey = config.yAxisKeys[0] || 'Value';
                  return (
                    <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                      {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
                      <XAxis
                        dataKey={xKey}
                        name={xKey}
                        tickFormatter={formatAxisTick}
                        stroke="#94a3b8"
                        fontSize={11}
                      />
                      <YAxis
                        dataKey={yKey}
                        name={yKey}
                        tickFormatter={formatAxisTick}
                        stroke="#94a3b8"
                        fontSize={11}
                      />
                      <ZAxis range={[50, 180]} />
                      <Tooltip content={<CustomTooltip />} />
                      {config.showLegend && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />}
                      <Scatter
                        name={`${xKey} vs ${yKey}`}
                        data={data}
                        fill={getSeriesColor(yKey, 0)}
                        className="cursor-pointer"
                        onClick={(entry: any) => {
                          const cat = entry?.[config.xAxisKey] ?? entry?.payload?.[config.xAxisKey];
                          if (cat !== undefined) handleCategoryClick(cat);
                        }}
                      />
                      {/* Trend line overlay for Scatter Chart */}
                      {isTrendLineActive && scatterTrend && scatterTrendPoints.length > 0 && (
                        <Scatter
                          name={`Trend (${scatterTrend.model}): ${scatterTrend.rSquaredFormatted}`}
                          data={scatterTrendPoints}
                          line={{
                            stroke: getSeriesColor(yKey, 0),
                            strokeWidth: 2.5,
                            strokeDasharray: '5 5',
                          }}
                          shape={() => null}
                          legendType="line"
                        />
                      )}
                    </ScatterChart>
                  );
                }

              case 'radar':
                {
                  return (
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      data={chartData}
                      onClick={(state: any) => {
                        if (state && state.activeLabel !== undefined) {
                          handleCategoryClick(state.activeLabel);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey={config.xAxisKey} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <PolarRadiusAxis stroke="#cbd5e1" fontSize={10} />
                      <Tooltip content={<CustomTooltip />} />
                      {config.showLegend && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                      {seriesKeys.slice(0, 5).map((key, idx) => {
                        const sColor = getSeriesColor(key, idx);
                        return (
                          <Radar
                            key={key}
                            name={key}
                            dataKey={key}
                            stroke={sColor}
                            fill={sColor}
                            fillOpacity={0.4}
                          />
                        );
                      })}
                    </RadarChart>
                  );
                }

              case 'composed':
                {
                  const secondaryKey = config.secondaryMetricKey || seriesKeys[1] || seriesKeys[0];
                  const primaryKeys = seriesKeys.filter((k) => k !== secondaryKey);

                  return (
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
                      onClick={(state: any) => {
                        if (state && state.activeLabel !== undefined) {
                          handleCategoryClick(state.activeLabel);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {config.showGrid && (
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      )}
                      <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="left" tickFormatter={formatAxisTick} stroke="#94a3b8" fontSize={11} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={formatAxisTick}
                        stroke="#94a3b8"
                        fontSize={11}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {config.showLegend && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />}
                      {primaryKeys.map((key, idx) => (
                        <Bar
                          key={key}
                          yAxisId="left"
                          dataKey={key}
                          fill={getSeriesColor(key, idx)}
                          radius={[4, 4, 0, 0]}
                          className="cursor-pointer"
                          onClick={(entry: any) => {
                            const cat = entry?.[config.xAxisKey] ?? entry?.payload?.[config.xAxisKey];
                            if (cat !== undefined) handleCategoryClick(cat);
                          }}
                        >
                          {chartData.map((entry, cIdx) => {
                            const catVal = entry[config.xAxisKey];
                            const isSelected = selectedCategory && String(selectedCategory.value) === String(catVal);
                            const isDimmed = selectedCategory && !isSelected;
                            return (
                              <Cell
                                key={`cell-comp-${key}-${cIdx}`}
                                fill={getSeriesColor(key, idx)}
                                opacity={isDimmed ? 0.35 : 1}
                                className="cursor-pointer transition-opacity duration-150"
                              />
                            );
                          })}
                        </Bar>
                      ))}
                      {secondaryKey && (
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey={secondaryKey}
                          stroke={getSeriesColor(secondaryKey, primaryKeys.length)}
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                        />
                      )}
                    </ComposedChart>
                  );
                }

              default:
                return <div>Unsupported chart format</div>;
            }
          })()}
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
