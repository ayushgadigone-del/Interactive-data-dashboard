import React from 'react';
import { ColumnMetadata, DataRow } from '../types';
import { ColumnOutlierStats } from '../utils/outlierDetection';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface RowSparklineProps {
  row: DataRow;
  numericColumns: ColumnMetadata[];
  columnStats: Record<string, ColumnOutlierStats>;
  isOutlierRow?: boolean;
}

export interface SparklinePointData {
  colName: string;
  rawValue: number | null;
  normalized: number; // 0 to 1 relative to column distribution [min, max]
  percentile: number;
  zScore: number;
  isOutlier: boolean;
  min: number;
  max: number;
  mean: number;
}

export const RowSparkline: React.FC<RowSparklineProps> = ({
  row,
  numericColumns,
  columnStats,
  isOutlierRow = false,
}) => {
  if (numericColumns.length === 0) {
    return <span className="text-stone-300 text-[10px] italic">No numeric data</span>;
  }

  // Calculate normalized points for each numeric column
  const points: SparklinePointData[] = numericColumns.map((col) => {
    const rawVal = row[col.name];
    const stats = columnStats[col.name];
    let numVal: number | null = null;

    if (typeof rawVal === 'number' && !isNaN(rawVal)) {
      numVal = rawVal;
    } else if (typeof rawVal === 'string' && rawVal.trim() !== '') {
      const parsed = Number(rawVal);
      if (!isNaN(parsed)) numVal = parsed;
    }

    const min = stats?.min ?? 0;
    const max = stats?.max ?? 1;
    const mean = stats?.mean ?? 0;
    const stdDev = stats?.stdDev ?? 0;

    const range = max - min;
    const normalized =
      numVal !== null && range > 0
        ? Math.max(0, Math.min(1, (numVal - min) / range))
        : 0.5;

    const zScore =
      numVal !== null && stdDev > 0 ? (numVal - mean) / stdDev : 0;

    const isOutlier = Math.abs(zScore) > 3;

    return {
      colName: col.name,
      rawValue: numVal,
      normalized,
      percentile: Math.round(normalized * 100),
      zScore,
      isOutlier,
      min,
      max,
      mean,
    };
  });

  const totalPoints = points.length;

  // Single Numeric Metric Distribution Sparkline
  if (totalPoints === 1) {
    const pt = points[0];
    const width = 100;
    const height = 24;
    const padX = 6;
    const dotX = padX + pt.normalized * (width - 2 * padX);
    const meanX =
      pt.max > pt.min
        ? padX + Math.max(0, Math.min(1, (pt.mean - pt.min) / (pt.max - pt.min))) * (width - 2 * padX)
        : width / 2;

    const isHighOutlier = pt.isOutlier && pt.zScore > 0;
    const isLowOutlier = pt.isOutlier && pt.zScore < 0;

    return (
      <div 
        className="flex items-center gap-2 group/sparkline cursor-help py-0.5"
        title={`Relative Column Distribution: "${pt.colName}"\nValue: ${pt.rawValue !== null ? pt.rawValue.toLocaleString() : '-'}\nPosition: ${pt.percentile}th percentile of column [${pt.min.toLocaleString()} to ${pt.max.toLocaleString()}]\nDeviation: ${pt.zScore > 0 ? '+' : ''}${pt.zScore.toFixed(2)}σ from mean (${pt.mean.toFixed(2)})`}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          {/* Distribution Track / Range */}
          <rect
            x={padX}
            y={height / 2 - 2}
            width={width - 2 * padX}
            height={4}
            rx={2}
            fill="#e2e8f0"
          />
          {/* Highlighted fill up to row value */}
          <rect
            x={padX}
            y={height / 2 - 2}
            width={Math.max(2, dotX - padX)}
            height={4}
            rx={2}
            fill={pt.isOutlier ? '#f43f5e' : '#6366f1'}
            opacity={0.7}
          />
          {/* Mean marker */}
          <line
            x1={meanX}
            y1={height / 2 - 5}
            x2={meanX}
            y2={height / 2 + 5}
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="1 1"
          />
          {/* Row Value Point */}
          <circle
            cx={dotX}
            cy={height / 2}
            r={pt.isOutlier ? 4 : 3}
            fill={pt.isOutlier ? '#e11d48' : '#4f46e5'}
            stroke="#ffffff"
            strokeWidth={1.5}
            className="transition-transform group-hover/sparkline:scale-125"
          />
        </svg>

        <span
          className={`text-[10px] font-mono font-bold px-1 py-0.2 rounded shrink-0 ${
            pt.isOutlier
              ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : 'text-stone-600 bg-stone-100'
          }`}
        >
          {pt.percentile}%
        </span>
      </div>
    );
  }

  // Multi-Metric Sparkline Trend Profile
  const width = 110;
  const height = 26;
  const padX = 6;
  const padY = 4;
  const innerW = width - 2 * padX;
  const innerH = height - 2 * padY;

  // Calculate SVG coordinates
  const coords = points.map((p, idx) => {
    const x = padX + (idx / (totalPoints - 1)) * innerW;
    const y = padY + (1 - p.normalized) * innerH;
    return { ...p, x, y };
  });

  // Calculate simple trend direction (linear regression slope of normalized values)
  const n = points.length;
  const xMean = (n - 1) / 2;
  const yMean = points.reduce((acc, p) => acc + p.normalized, 0) / n;
  let num = 0;
  let den = 0;
  points.forEach((p, i) => {
    num += (i - xMean) * (p.normalized - yMean);
    den += Math.pow(i - xMean, 2);
  });
  const slope = den !== 0 ? num / den : 0;
  const trendDirection: 'up' | 'down' | 'flat' =
    slope > 0.08 ? 'up' : slope < -0.08 ? 'down' : 'flat';

  // Construct SVG path string
  const linePath = coords.reduce(
    (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`,
    ''
  );
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${(height - padY).toFixed(1)} L ${coords[0].x.toFixed(1)},${(height - padY).toFixed(1)} Z`;

  // Color scheme
  const strokeColor = isOutlierRow
    ? '#e11d48' // Rose for outlier rows
    : trendDirection === 'up'
    ? '#4f46e5' // Indigo for rising
    : trendDirection === 'down'
    ? '#0284c7' // Blue/Cyan for descending
    : '#64748b'; // Slate for balanced

  const avgPercentile = Math.round(yMean * 100);

  // Generate detailed tooltip text
  const tooltipText = [
    `Row Metrics Profile (Relative to Column Distribution):`,
    `Overall Relative Level: ${avgPercentile}% avg (${trendDirection === 'up' ? 'Rising Trend ↗' : trendDirection === 'down' ? 'Descending Trend ↘' : 'Balanced ↔'})`,
    ...points.map(
      (p) =>
        `• ${p.colName}: ${p.rawValue !== null ? p.rawValue.toLocaleString() : 'N/A'} (${p.percentile}th percentile, ${p.zScore > 0 ? '+' : ''}${p.zScore.toFixed(2)}σ${p.isOutlier ? ' ⚠️ 3σ OUTLIER' : ''})`
    ),
  ].join('\n');

  return (
    <div
      className="inline-flex items-center gap-2 group/sparkline cursor-help py-0.5 select-none"
      title={tooltipText}
    >
      <div className="relative">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`sparkline-grad-${coords[0].x.toFixed(0)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* 50% Median Reference Dashed Line */}
          <line
            x1={padX}
            y1={padY + innerH / 2}
            x2={width - padX}
            y2={padY + innerH / 2}
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="2 2"
          />

          {/* Area under the trend curve */}
          <path
            d={areaPath}
            fill={`url(#sparkline-grad-${coords[0].x.toFixed(0)})`}
          />

          {/* Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Markers at each metric */}
          {coords.map((pt, idx) => (
            <circle
              key={pt.colName}
              cx={pt.x}
              cy={pt.y}
              r={pt.isOutlier ? 3.5 : 2}
              fill={pt.isOutlier ? '#e11d48' : '#ffffff'}
              stroke={pt.isOutlier ? '#ffffff' : strokeColor}
              strokeWidth={pt.isOutlier ? 1.5 : 1.2}
              className="transition-transform group-hover/sparkline:scale-125"
            />
          ))}
        </svg>
      </div>

      {/* Mini Trend Direction & Average Level Badge */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] ${
            isOutlierRow
              ? 'bg-rose-100 text-rose-800 font-bold'
              : trendDirection === 'up'
              ? 'bg-indigo-50 text-indigo-700'
              : trendDirection === 'down'
              ? 'bg-sky-50 text-sky-700'
              : 'bg-stone-100 text-stone-600'
          }`}
          title={`Trend: ${trendDirection} (${slope.toFixed(2)} slope)`}
        >
          {isOutlierRow ? (
            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
          ) : trendDirection === 'up' ? (
            <TrendingUp className="w-2.5 h-2.5" />
          ) : trendDirection === 'down' ? (
            <TrendingDown className="w-2.5 h-2.5" />
          ) : (
            <Minus className="w-2.5 h-2.5" />
          )}
        </span>
        <span className="text-[10px] font-mono text-stone-500 font-medium">
          {avgPercentile}%
        </span>
      </div>
    </div>
  );
};
